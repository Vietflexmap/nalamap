"use client";

import { ChangeEvent, DragEvent, ReactNode, useState } from "react";
import {
  BarChart3,
  Check,
  CircleDot,
  Combine,
  Database,
  Eye,
  EyeOff,
  FileOutput,
  FileText,
  GitCompare,
  Grid3X3,
  Image as ImageIcon,
  Info,
  Layers3,
  LocateFixed,
  Map,
  Mountain,
  Plus,
  ScanLine,
  Scissors,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { GeoDataObject } from "../../models/geodatamodel";
import styles from "./workbench.module.css";

export type WorkbenchPanel = "overview" | "layers" | "analysis" | "raster" | "composer";

type WorkbenchNavigatorProps = {
  activePanel: WorkbenchPanel;
  onPanelChange: (panel: WorkbenchPanel) => void;
  layers: GeoDataObject[];
  selectedLayers: GeoDataObject[];
  onRunPrompt: (prompt: string) => void;
  onToggleLayer: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onZoomToLayer: (id: string) => void;
  onImportFile: (file: File) => void;
  basemapKey: string;
  onBasemapChange: (key: string) => void;
  gridVisible: boolean;
  onGridChange: (visible: boolean) => void;
  onPrint: () => void;
};

const panelMeta: Record<WorkbenchPanel, { label: string; eyebrow: string; description: string }> = {
  overview: {
    label: "Overview",
    eyebrow: "Workspace",
    description: "Điểm bắt đầu cho mọi tác vụ bản đồ và phân tích không gian.",
  },
  layers: {
    label: "Layers",
    eyebrow: "Data catalog",
    description: "Quản lý lớp, nguồn dữ liệu và thứ tự hiển thị.",
  },
  analysis: {
    label: "Analysis",
    eyebrow: "Geo-processing",
    description: "Chọn tác vụ hoặc mô tả yêu cầu bằng ngôn ngữ tự nhiên.",
  },
  raster: {
    label: "Raster lab",
    eyebrow: "Raster workspace",
    description: "Làm việc với WCS, WMTS, DEM và các lớp raster trên bản đồ.",
  },
  composer: {
    label: "Composer",
    eyebrow: "Bando Composer",
    description: "Bố cục nhanh theo tinh thần Vietflexmap/bando để in và trình bày.",
  },
};

function layerType(layer: GeoDataObject): string {
  const explicit = layer.layer_type?.toUpperCase();
  if (explicit) return explicit;
  const link = layer.data_link.toLowerCase();
  if (link.includes("wms")) return "WMS";
  if (link.includes("wmts")) return "WMTS";
  if (link.includes("wcs") || /\.(tif|tiff)(\?|$)/.test(link)) return "RASTER";
  return "VECTOR";
}

function layerLabel(layer: GeoDataObject): string {
  return layer.title || layer.name || "Untitled layer";
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function ImportDropzone({ onImportFile }: { onImportFile: (file: File) => void }) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImportFile(file);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) onImportFile(file);
  };

  return (
    <label
      className={styles.dropzone}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        className={styles.hiddenInput}
        type="file"
        accept=".geojson,.json,.tif,.tiff,.gpkg,.kml,application/geo+json,application/json"
        onChange={handleChange}
      />
      <span className={styles.dropzoneIcon}>
        <UploadCloud size={18} />
      </span>
      <span>
        <strong>Nạp dữ liệu</strong>
        <small>GeoJSON, GeoPackage, KML hoặc GeoTIFF</small>
      </span>
      <Plus size={16} className={styles.dropzonePlus} />
    </label>
  );
}

function PanelHeader({ panel }: { panel: WorkbenchPanel }) {
  const meta = panelMeta[panel];
  return (
    <div className={styles.panelHeader}>
      <span className={styles.eyebrow}>{meta.eyebrow}</span>
      <h1>{meta.label}</h1>
      <p>{meta.description}</p>
    </div>
  );
}

function OperationCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button className={styles.operationCard} type="button" onClick={onClick}>
      <span className={styles.operationIcon}>{icon}</span>
      <span className={styles.operationCopy}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className={styles.operationArrow}>↗</span>
    </button>
  );
}

export default function WorkbenchNavigator({
  activePanel,
  onPanelChange,
  layers,
  selectedLayers,
  onRunPrompt,
  onToggleLayer,
  onToggleSelection,
  onRemoveLayer,
  onZoomToLayer,
  onImportFile,
  basemapKey,
  onBasemapChange,
  gridVisible,
  onGridChange,
  onPrint,
}: WorkbenchNavigatorProps) {
  const [bufferDistance, setBufferDistance] = useState("1000");
  const [bufferUnit, setBufferUnit] = useState("meters");
  const [pageSize, setPageSize] = useState("A3");
  const [orientation, setOrientation] = useState("landscape");
  const selectedNames = selectedLayers.map(layerLabel).join(", ");
  const targetName = selectedNames || "lớp đang chọn";

  const runBuffer = () => {
    onRunPrompt(
      `Tạo vùng đệm ${bufferDistance} ${bufferUnit} cho ${targetName}. Tự động chọn CRS phù hợp, giữ thuộc tính và thêm kết quả vào bản đồ.`,
    );
  };

  const runOverlay = () => {
    onRunPrompt(
      `Giao cắt ${selectedNames || "hai lớp đang chọn"}. Trả về lớp kết quả có thuộc tính của các lớp đầu vào và thêm vào bản đồ.`,
    );
  };

  const renderOverview = () => (
    <>
      <div className={styles.welcomeCard}>
        <span className={styles.welcomeOrb}>
          <Sparkles size={20} />
        </span>
        <div>
          <span className={styles.eyebrow}>Natural-language GIS</span>
          <h2>Hỏi bản đồ như hỏi một chuyên gia GIS</h2>
          <p>
            Nạp dữ liệu, chọn lớp và mô tả mục tiêu. NaLaMap sẽ lập kế hoạch,
            gọi geoprocessing và đưa kết quả trở lại workspace.
          </p>
        </div>
      </div>

      <div className={styles.metricGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}><Layers3 size={16} /></span>
          <strong>{layers.length}</strong>
          <small>Lớp trong phiên</small>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}><ScanLine size={16} /></span>
          <strong>{selectedLayers.length}</strong>
          <small>Lớp đang chọn</small>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}><Database size={16} /></span>
          <strong>WGS 84</strong>
          <small>CRS hiển thị</small>
        </div>
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeading}>
          <span>Khởi động nhanh</span>
          <small>Chọn một lệnh mẫu</small>
        </div>
        <div className={styles.promptList}>
          <button type="button" onClick={() => onRunPrompt("Tóm tắt các lớp hiện có trên bản đồ và đề xuất phép phân tích phù hợp.")}>
            <span className={styles.promptDot}>01</span>
            <span><strong>Đọc nhanh workspace</strong><small>Tóm tắt dữ liệu và phạm vi không gian</small></span>
          </button>
          <button type="button" onClick={() => onRunPrompt("Tính tâm của các đối tượng trong lớp đang chọn và thêm lớp tâm vào bản đồ.")}>
            <span className={styles.promptDot}>02</span>
            <span><strong>Tạo tâm đối tượng</strong><small>Centroid cho polygon hoặc vùng</small></span>
          </button>
          <button type="button" onClick={() => onRunPrompt("Kiểm tra chất lượng hình học, CRS và thuộc tính của các lớp đang chọn.")}>
            <span className={styles.promptDot}>03</span>
            <span><strong>Kiểm tra dữ liệu</strong><small>Geometry, CRS, trường thuộc tính</small></span>
          </button>
        </div>
      </div>

      <div className={styles.infoStrip}>
        <Info size={15} />
        <span>Chọn lớp bằng ô vuông trong tab Layers để dùng các phép giao cắt và clip.</span>
      </div>
    </>
  );

  const renderLayers = () => (
    <>
      <ImportDropzone onImportFile={onImportFile} />
      <div className={styles.layerToolbar}>
        <span>{formatCount(layers.length, "lớp", "lớp")}</span>
        <span>{selectedLayers.length} selected</span>
      </div>
      {layers.length === 0 ? (
        <div className={styles.emptyState}>
          <Layers3 size={25} />
          <strong>Chưa có lớp dữ liệu</strong>
          <span>Nạp GeoJSON hoặc hỏi NaLaMap tìm dữ liệu cho bạn.</span>
        </div>
      ) : (
        <div className={styles.layerList}>
          {[...layers].reverse().map((layer) => {
            const type = layerType(layer);
            const selected = selectedLayers.some((item) => item.id === layer.id);
            return (
              <div key={layer.id} className={`${styles.layerRow} ${selected ? styles.layerRowSelected : ""}`}>
                <button
                  type="button"
                  className={`${styles.selectionBox} ${selected ? styles.selectionBoxActive : ""}`}
                  onClick={() => onToggleSelection(layer.id)}
                  aria-label={`Chọn ${layerLabel(layer)}`}
                >
                  {selected && <Check size={12} />}
                </button>
                <button
                  type="button"
                  className={styles.layerEye}
                  onClick={() => onToggleLayer(layer.id)}
                  aria-label={layer.visible ? `Ẩn ${layerLabel(layer)}` : `Hiện ${layerLabel(layer)}`}
                >
                  {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <span className={styles.layerSwatch} style={{ background: layer.style?.stroke_color || "#52b39e" }} />
                <span className={styles.layerInfo}>
                  <strong title={layerLabel(layer)}>{layerLabel(layer)}</strong>
                  <small>{type} · {layer.data_origin || "session"}</small>
                </span>
                <button type="button" className={styles.layerAction} onClick={() => onZoomToLayer(layer.id)} aria-label={`Đến ${layerLabel(layer)}`}>
                  <LocateFixed size={14} />
                </button>
                <button type="button" className={`${styles.layerAction} ${styles.layerDelete}`} onClick={() => onRemoveLayer(layer.id)} aria-label={`Xóa ${layerLabel(layer)}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className={styles.controlCard}>
        <label className={styles.fieldLabel} htmlFor="workbench-basemap">Basemap</label>
        <select id="workbench-basemap" className={styles.selectField} value={basemapKey} onChange={(event) => onBasemapChange(event.target.value)}>
          <option value="google-roadmap">Vietflex · Google Roadmap</option>
          <option value="google-satellite">Google Satellite</option>
          <option value="google-hybrid">Google Hybrid</option>
          <option value="google-terrain">Google Terrain</option>
          <option value="esri-imagery">Esri World Imagery</option>
          <option value="carto-light">Carto Light</option>
        </select>
      </div>
    </>
  );

  const renderAnalysis = () => (
    <>
      <div className={styles.selectionBanner}>
        <span className={styles.selectionIcon}><ScanLine size={17} /></span>
        <span><strong>{selectedLayers.length} lớp đã chọn</strong><small>{selectedNames || "Chọn lớp trong tab Layers"}</small></span>
      </div>
      <div className={styles.controlCard}>
        <div className={styles.sectionHeading}>
          <span>Vùng đệm</span>
          <small>Buffer · smart CRS</small>
        </div>
        <div className={styles.inlineFields}>
          <label className={styles.fieldLabel}>Khoảng cách
            <input className={styles.inputField} value={bufferDistance} onChange={(event) => setBufferDistance(event.target.value)} inputMode="decimal" />
          </label>
          <label className={styles.fieldLabel}>Đơn vị
            <select className={styles.selectField} value={bufferUnit} onChange={(event) => setBufferUnit(event.target.value)}>
              <option value="meters">mét</option>
              <option value="kilometers">kilômét</option>
              <option value="miles">dặm</option>
            </select>
          </label>
        </div>
        <button type="button" className={styles.primaryButton} onClick={runBuffer}>Chạy buffer <span>↗</span></button>
      </div>
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeading}><span>Phép phân tích</span><small>Agent sẽ thực thi</small></div>
        <div className={styles.operationList}>
          <OperationCard icon={<GitCompare size={17} />} title="Giao cắt / Intersect" description="Tìm phần không gian chồng lấn giữa các lớp." onClick={runOverlay} />
          <OperationCard icon={<CircleDot size={17} />} title="Tính tâm / Centroid" description="Tạo điểm đại diện cho từng đối tượng." onClick={() => onRunPrompt(`Tính tâm của ${targetName} và thêm kết quả vào bản đồ.`)} />
          <OperationCard icon={<Scissors size={17} />} title="Cắt theo vùng / Clip" description="Giới hạn dữ liệu theo lớp AOI hoặc vùng chọn." onClick={() => onRunPrompt(`Cắt ${targetName} theo vùng AOI phù hợp trong workspace và thêm kết quả vào bản đồ.`)} />
          <OperationCard icon={<Combine size={17} />} title="Dissolve / Gộp vùng" description="Gộp hình học theo trường thuộc tính." onClick={() => onRunPrompt(`Dissolve ${targetName} theo thuộc tính phù hợp và giữ lại dữ liệu mô tả.`)} />
        </div>
      </div>
      <div className={styles.infoStrip}><Sparkles size={15} /><span>NaLaMap tự chọn CRS phẳng phù hợp cho buffer và overlay để giảm sai số đo.</span></div>
    </>
  );

  const rasterLayers = layers.filter((layer) => {
    const type = layerType(layer);
    return type === "RASTER" || type === "WCS" || type === "WMTS" || /\.(tif|tiff)(\?|$)/i.test(layer.data_link);
  });

  const renderRaster = () => (
    <>
      <div className={styles.rasterHero}>
        <span className={styles.rasterIcon}><Mountain size={20} /></span>
        <span><strong>Raster analysis lab</strong><small>WCS / WMTS / DEM · raster-aware prompts</small></span>
      </div>
      {rasterLayers.length === 0 ? (
        <div className={styles.emptyState}>
          <ImageIcon size={25} />
          <strong>Chưa có lớp raster</strong>
          <span>Nạp GeoTIFF hoặc thêm WCS/WMTS từ GeoServer.</span>
          <button type="button" className={styles.secondaryButton} onClick={() => onRunPrompt("Tìm một lớp DEM hoặc raster độ cao phù hợp cho khu vực đang xem.")}>Tìm dữ liệu raster</button>
        </div>
      ) : (
        <div className={styles.layerList}>
          {rasterLayers.map((layer) => (
            <div key={layer.id} className={styles.rasterRow}>
              <span className={styles.rasterThumb}><ImageIcon size={16} /></span>
              <span className={styles.layerInfo}><strong>{layerLabel(layer)}</strong><small>{layerType(layer)} · {layer.visible ? "visible" : "hidden"}</small></span>
              <button type="button" className={styles.layerAction} onClick={() => onZoomToLayer(layer.id)} aria-label={`Đến ${layerLabel(layer)}`}><LocateFixed size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeading}><span>Tác vụ raster</span><small>Natural language</small></div>
        <div className={styles.operationList}>
          <OperationCard icon={<BarChart3 size={17} />} title="Thống kê raster" description="Min, max, mean, NoData và histogram theo vùng." onClick={() => onRunPrompt("Tính thống kê raster cho lớp raster đang chọn, gồm min, max, mean, NoData và phạm vi dữ liệu.")} />
          <OperationCard icon={<Mountain size={17} />} title="Địa hình từ DEM" description="Đề xuất slope, aspect, hillshade hoặc contour." onClick={() => onRunPrompt("Từ lớp DEM đang chọn, tạo hillshade và slope để hiển thị trên bản đồ.")} />
          <OperationCard icon={<Grid3X3 size={17} />} title="Reclassify / ngưỡng" description="Phân lớp raster theo ngưỡng do bạn mô tả." onClick={() => onRunPrompt("Phân lớp raster theo các ngưỡng phù hợp, giải thích cách chọn ngưỡng và thêm kết quả vào bản đồ.")} />
        </div>
      </div>
      <div className={styles.infoStrip}><Info size={15} /><span>WCS/WMTS hiển thị trực tiếp; xử lý GeoTIFF nặng nên được chuyển cho backend hoặc MCP raster worker.</span></div>
    </>
  );

  const renderComposer = () => (
    <>
      <div className={styles.composerCard}>
        <span className={styles.composerMark}><FileText size={19} /></span>
        <span><strong>Bando Composer</strong><small>Bố cục bản đồ theo tinh thần Vietflexmap/bando.</small></span>
      </div>
      <div className={styles.controlCard}>
        <div className={styles.inlineFields}>
          <label className={styles.fieldLabel}>Khổ giấy
            <select className={styles.selectField} value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
              <option value="A4">A4</option><option value="A3">A3</option><option value="A2">A2</option>
            </select>
          </label>
          <label className={styles.fieldLabel}>Hướng
            <select className={styles.selectField} value={orientation} onChange={(event) => setOrientation(event.target.value)}>
              <option value="landscape">Ngang</option><option value="portrait">Dọc</option>
            </select>
          </label>
        </div>
        <div className={styles.toggleList}>
          <label><input type="checkbox" checked={gridVisible} onChange={(event) => onGridChange(event.target.checked)} /><Grid3X3 size={15} />Lưới tọa độ</label>
          <label><input type="checkbox" defaultChecked /><Map size={15} />Mũi tên Bắc & tỷ lệ</label>
          <label><input type="checkbox" defaultChecked /><Sparkles size={15} />Watermark Vietflexmap</label>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onPrint}><FileOutput size={15} /> In / lưu PDF <span>↗</span></button>
      </div>
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeading}><span>Kiểu trình bày</span><small>{pageSize} · {orientation === "landscape" ? "ngang" : "dọc"}</small></div>
        <div className={styles.composerChecklist}>
          <span><Check size={14} /> Neatline bản đồ</span>
          <span><Check size={14} /> Nguồn dữ liệu & ngày lập</span>
          <span><Check size={14} /> Chú giải theo lớp</span>
          <span><Check size={14} /> Tương thích in nhanh</span>
        </div>
      </div>
      <div className={styles.infoStrip}><Info size={15} /><span>Khung bản đồ trung tâm có thể xuất qua Print / Save PDF của trình duyệt; dữ liệu lớp vẫn lấy từ NaLaMap.</span></div>
    </>
  );

  return (
    <aside className={styles.navigator} aria-label="Workbench navigator">
      <div className={styles.navigatorTabs}>
        {(Object.keys(panelMeta) as WorkbenchPanel[]).map((panel) => (
          <button key={panel} type="button" className={activePanel === panel ? styles.navigatorTabActive : ""} onClick={() => onPanelChange(panel)}>
            <span>{panelMeta[panel].label}</span>
          </button>
        ))}
      </div>
      <div className={styles.navigatorScroll}>
        <PanelHeader panel={activePanel} />
        {activePanel === "overview" && renderOverview()}
        {activePanel === "layers" && renderLayers()}
        {activePanel === "analysis" && renderAnalysis()}
        {activePanel === "raster" && renderRaster()}
        {activePanel === "composer" && renderComposer()}
      </div>
    </aside>
  );
}
