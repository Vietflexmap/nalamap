# NaLaMap Geo Workbench

The `/workbench` route is the professional GIS workspace for NaLaMap. It combines the existing Leaflet map, layer store, streaming AI agent, and geoprocessing backend in one focused layout.

## What was integrated

- A command bar and chat assistant for natural-language GIS tasks.
- Shared layer catalog with visibility, selection, delete, zoom-to-layer, and file import actions.
- Quick prompts for buffer, intersect, centroid, clip, dissolve, data QA, and raster analysis.
- Model/provider selectors populated from the existing `/settings/options` response. GLM is available when the backend has `GLM_API_KEY` or `ZHIPUAI_API_KEY` configured.
- A Bando-inspired map composer with page size, orientation, coordinate grid, and browser print/PDF output.
- Basemap choices for Google, Esri World Imagery, and Carto Light.

The Bando repository is used as a UX/reference integration: its map-composer ideas are represented as native React controls so the workbench keeps NaLaMap's existing state, authentication, and agent flow. It is not embedded as a separate iframe or application.

## Route and architecture

`frontend/app/workbench/page.tsx` renders `WorkbenchShell`, which owns the workbench layout. `WorkbenchNavigator` provides the five workspaces and `WorkbenchAssistant` consumes the existing `useNaLaMapAgent` streaming hook.

The assistant sends prompts to the same `POST /api/chat/stream` endpoint as the original map screen. The optional query override added to `useNaLaMapAgent` lets quick actions submit directly without mutating the legacy chat input first.

## Data handling

- GeoJSON/JSON files are validated in the browser before upload. If the upload service is unavailable, a local object-URL preview is added to the current session.
- Uploaded vector layers are rendered by the existing Leaflet GeoJSON pipeline.
- WMS, WCS, and WMTS continue to use the existing service parsers and Web Mercator safeguards.
- GeoTIFF is catalogued in Raster lab and routed to the backend/MCP raster worker for heavy processing. The browser workbench does not pretend to run a full GeoTIFF engine locally.

## GLM configuration

```bash
LLM_PROVIDER=glm
GLM_API_KEY=your_zai_api_key
GLM_MODEL=glm-4.5
GLM_API_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

The adapter uses the OpenAI-compatible GLM API surface. See the [GLM/Z.AI developer documentation](https://docs.z.ai/) and `backend/docs/AI_PROVIDERS.md` for provider details.

## Local verification

```bash
cd frontend
npm run build
npm run lint
npm test -- tests/workbench.spec.ts
```

`npm run lint` currently reports pre-existing issues across the repository; new workbench files should remain warning/error free apart from repository-wide configuration findings.
