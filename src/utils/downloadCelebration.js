export const DOWNLOAD_SUCCESS_EVENT = "mlmlive:download-success";

export function celebrateDownload() {
  window.dispatchEvent(new CustomEvent(DOWNLOAD_SUCCESS_EVENT));
}
