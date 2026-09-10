import { expect, test } from "@playwright/test";

test("renders the professional GIS workbench and switches tools", async ({ page }) => {
  await page.goto("/workbench", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("workbench-shell")).toBeVisible();
  await expect(page.getByTestId("workbench-command-input")).toBeVisible();
  await expect(page.getByTestId("workbench-assistant")).toBeVisible();
  await expect(page.getByText("Hỏi bản đồ như hỏi một chuyên gia GIS")).toBeVisible();

  await page.getByTestId("workbench-nav-analysis").click();
  await expect(page.getByText("Geo-processing")).toBeVisible();
  await expect(page.getByText("Vùng đệm")).toBeVisible();

  await page.getByTestId("workbench-nav-raster").click();
  await expect(page.getByText("Raster analysis lab")).toBeVisible();

  await page.getByTestId("workbench-command-input").fill("Tính tâm các polygon đang chọn");
  await expect(page.getByTestId("workbench-command-input")).toHaveValue("Tính tâm các polygon đang chọn");
});
