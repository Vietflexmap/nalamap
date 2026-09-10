"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  Bot,
  CircleHelp,
  Expand,
  FileText,
  Grid3X3,
  Image as ImageIcon,
  Layers3,
  LocateFixed,
  Map,
  MessageSquare,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Settings,
  Sparkles,
  Workflow,
} from "lucide-react";
import MapComponent from "../maps/MapComponent";
import { useLayerStore } from "../../stores/layerStore";
import { useMapStore } from "../../stores/mapStore";
import type { GeoDataObject } from "../../models/geodatamodel";
import WorkbenchAssistant from "./WorkbenchAssistant";
import WorkbenchNavigator, { WorkbenchPanel } from "./WorkbenchNavigator";
import styles from "./workbench.module.css";
import { getUploadUrl } from "../../utils/apiBase";

type BasemapDefinition = {
  url: string;
  attribution: string;
};

const BASEMAPS: Record<string, BasemapDefinition> = {
  "google-roadmap": {
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attribution: "&copy; Google Maps",
  },
  "google-satellite": {
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: "&copy; Google Satellite",
  },
  "google-hybrid": {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: "&copy; Google Hybrid",
  },
  "google-terrain": {
    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    attribution: "&copy; Google Terrain",
  },
  "esri-imagery": {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  "carto-light": {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors, &copy; CARTO",
  },
};

const PANEL_ICONS: Record<WorkbenchPanel, typeof Map> = {
  overview: Activity,
  layers: Layers3,
  analysis: Workflow,
  raster: ImageIcon,
  composer: FileText,
};

function localLayerFromFile(file: File, link: string): GeoDataObject {
  const lowerName = file.name.toLowerCase();
  const raster = /\.(tif|tiff)$/i.test(lowerName);
  return {
    id: `workbench-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data_source_id: "workbench",
    data_type: raster ? "raster" : "uploaded",
    data_origin: "workbench-local",
    data_source: "user",
    data_link: link,
    name: file.name,
    title: file.name,
    layer_type: raster ? "RASTER" : "UPLOADED",
    visible: true,
    selected: false,
    properties: {},
    style: raster
      ? undefined
      : {
          stroke_color: "#0c8d7a",
          stroke_weight: 2,
          fill_color: "#8fd6bd",
          fill_opacity: 0.32,
        },
  };
}

export default function WorkbenchShell() {
  const [activePanel, setActivePanel] = useState<WorkbenchPanel>("overview");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [commandDraft, setCommandDraft] = useState("");
  const [basemapKey, setBasemapKey] = useState("google-roadmap");
  const [gridVisible, setGridVisible] = useState(true);
  const [online, setOnline] = useState(true);
  const [importNotice, setImportNotice] = useState("Phiên bản đồ sẵn sàng");

  const layers = useLayerStore((state) => state.layers);
  const selectedLayers = layers.filter((layer) => layer.selected);
  const addLayer = useLayerStore((state) => state.addLayer);
  const removeLayer = useLayerStore((state) => state.removeLayer);
  const toggleLayerVisibility = useLayerStore((state) => state.toggleLayerVisibility);
  const toggleLayerSelection = useLayerStore((state) => state.toggleLayerSelection);
  const setZoomTo = useLayerStore((state) => state.setZoomTo);
  const setBasemap = useMapStore((state) => state.setBasemap);

  useEffect(() => {
    setBasemap(BASEMAPS["google-roadmap"]);
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, [setBasemap]);

  const runPrompt = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
  }, []);

  const consumePendingPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  const handleBasemapChange = useCallback((key: string) => {
    setBasemapKey(key);
    setBasemap(BASEMAPS[key] || BASEMAPS["google-roadmap"]);
  }, [setBasemap]);

  const handleImportFile = useCallback(async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isGeoJson = /\.(geojson|json)$/.test(lowerName);
    let localLink: string | null = null;

    try {
      if (isGeoJson) {
        const text = await file.text();
        const parsed = JSON.parse(text) as { type?: string };
        if (!parsed.type) throw new Error("GeoJSON thiếu trường type");
        localLink = URL.createObjectURL(new Blob([text], { type: "application/geo+json" }));
      }

      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(getUploadUrl(), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      const result = (await response.json()) as { url?: string; id?: string };
      if (!result.url) throw new Error("Upload response thiếu URL dữ liệu");

      addLayer({
        ...localLayerFromFile(file, result.url),
        id: result.id || `upload-${Date.now()}`,
        data_origin: "uploaded",
      });
      setImportNotice(`${file.name} đã được nạp vào workspace`);
    } catch (error) {
      if (isGeoJson && localLink) {
        addLayer(localLayerFromFile(file, localLink));
        setImportNotice(`${file.name} đang dùng bản xem trước cục bộ; backend upload chưa sẵn sàng`);
        return;
      }
      setImportNotice(`Không thể nạp ${file.name}: ${error instanceof Error ? error.message : "lỗi không xác định"}`);
    }
  }, [addLayer]);

  const handleCommandSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = commandDraft.trim();
    if (!prompt) return;
    setCommandDraft("");
    runPrompt(prompt);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  };

  const focusMap = () => {
    if (layers[0]) {
      setZoomTo(layers[0].id);
      setImportNotice(`Đang đưa bản đồ tới ${layers[0].title || layers[0].name}`);
    } else {
      setImportNotice("Nạp một lớp để tự động đưa bản đồ tới phạm vi dữ liệu");
    }
  };

  return (
    <main className={styles.shell} data-testid="workbench-shell">
      <header className={styles.topbar}>
        <Link href="/map" className={styles.brand} aria-label="Về bản đồ NaLaMap">
          <span className={styles.brandMark}><Map size={18} /></span>
          <span className={styles.brandCopy}>
            <span className={styles.brandEyebrow}>Vietflexmap</span>
            <strong>NaLaMap Workbench</strong>
            <small>AI geospatial studio</small>
          </span>
        </Link>
        <form className={styles.commandBar} onSubmit={handleCommandSubmit}>
          <Sparkles size={15} className={styles.commandIcon} />
          <input
            className={styles.commandInput}
            value={commandDraft}
            onChange={(event) => setCommandDraft(event.target.value)}
            placeholder="Mô tả nhiệm vụ GIS: buffer, giao cắt, centroid..."
            aria-label="Lệnh GIS bằng ngôn ngữ tự nhiên"
            data-testid="workbench-command-input"
          />
          <span className={styles.commandHint}>⌘ K</span>
        </form>
        <div className={styles.topbarActions}>
          <Link href="/map" className={styles.topbarButton}><PanelLeft size={14} /><span>Map view</span></Link>
          <Link href="/settings" className={styles.topbarButton}><Settings size={14} /><span>Settings</span></Link>
          <button type="button" className={styles.topbarButton} onClick={() => setImportNotice("Trợ giúp: hãy chọn lớp rồi mô tả tác vụ ở thanh lệnh") }><CircleHelp size={14} /><span>Help</span></button>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.rail} aria-label="Workbench sections">
          {(Object.keys(PANEL_ICONS) as WorkbenchPanel[]).map((panel) => {
            const Icon = PANEL_ICONS[panel];
            return (
              <button
                key={panel}
                type="button"
                className={`${styles.railButton} ${activePanel === panel ? styles.railButtonActive : ""}`}
                onClick={() => setActivePanel(panel)}
                title={panel}
                aria-label={panel}
                data-testid={`workbench-nav-${panel}`}
              >
                <Icon size={17} />
              </button>
            );
          })}
          <span className={styles.railSpacer} />
          <button type="button" className={styles.railButton} title="Refresh view" aria-label="Refresh view" onClick={() => window.location.reload()}>
            <RotateCcw size={16} />
          </button>
          <button type="button" className={styles.railButton} title="AI assistant" aria-label="AI assistant" onClick={() => runPrompt("Tóm tắt trạng thái workspace hiện tại và đề xuất bước tiếp theo.")}>
            <Bot size={16} />
          </button>
        </nav>

        <WorkbenchNavigator
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          layers={layers}
          selectedLayers={selectedLayers}
          onRunPrompt={runPrompt}
          onToggleLayer={toggleLayerVisibility}
          onToggleSelection={toggleLayerSelection}
          onRemoveLayer={removeLayer}
          onZoomToLayer={setZoomTo}
          onImportFile={handleImportFile}
          basemapKey={basemapKey}
          onBasemapChange={handleBasemapChange}
          gridVisible={gridVisible}
          onGridChange={setGridVisible}
          onPrint={() => window.print()}
        />

        <section className={styles.mapStage} aria-label="Bản đồ trung tâm">
          <div className={styles.mapViewport}>
            <MapComponent initialCenter={[16.2, 107.8]} initialZoom={5} />
          </div>
          <div className={styles.mapToolbar}>
            <div className={styles.mapToolbarGroup}>
              <button type="button" className={`${styles.mapToolButton} ${gridVisible ? styles.mapToolButtonActive : ""}`} onClick={() => setGridVisible((value) => !value)} title="Bật / tắt lưới tọa độ"><Grid3X3 size={14} /><span>Lưới</span></button>
              <button type="button" className={styles.mapToolButton} onClick={focusMap} title="Đưa tới lớp dữ liệu"><LocateFixed size={14} /><span>Đến lớp</span></button>
            </div>
            <div className={styles.mapToolbarGroup}>
              <button type="button" className={styles.mapToolButton} onClick={toggleFullscreen} title="Toàn màn hình"><Expand size={14} /><span>Toàn màn hình</span></button>
              <button type="button" className={styles.mapToolButton} onClick={() => runPrompt("Mô tả các lớp đang hiển thị trong bản đồ và phạm vi không gian hiện tại.")} title="Hỏi về bản đồ"><MessageSquare size={14} /><span>Hỏi AI</span></button>
            </div>
          </div>
          {gridVisible && <div className={styles.mapGrid} aria-hidden="true" />}
          <div className={styles.mapHud}>
            <div className={styles.mapHudTitle}>Viet Nam · AI map canvas</div>
            <div className={styles.mapHudSub}>{layers.length} lớp · {selectedLayers.length} đang chọn · EPSG:4326</div>
          </div>
          <div className={styles.mapLegend}><span className={styles.mapLegendDot} /> Lớp dữ liệu NaLaMap</div>
        </section>

        <WorkbenchAssistant pendingPrompt={pendingPrompt} onPendingPromptConsumed={consumePendingPrompt} />
      </div>

      <footer className={styles.statusbar}>
        <span className={styles.statusItem}><span className={styles.statusDot} /> {online ? "Online" : "Offline"}</span>
        <span className={styles.statusItem}><Layers3 size={11} /> {layers.length} layers</span>
        <span className={styles.statusItem}><PanelRight size={11} /> {selectedLayers.length} selected</span>
        <span className={styles.statusItem}><Activity size={11} /> {importNotice}</span>
        <span className={styles.statusItem}><Sparkles size={11} /> AI GIS agent</span>
      </footer>
    </main>
  );
}
