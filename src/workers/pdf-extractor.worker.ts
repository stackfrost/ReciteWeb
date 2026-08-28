import init, { extract_spatial_bounding_boxes } from './wasm-pdf/citeassist_pdf_wasm';

let isWasmInitialized = false;

self.onmessage = async (e: MessageEvent<{ pdfBuffer: ArrayBuffer }>) => {
  try {
    if (!isWasmInitialized) {
      await init();
      isWasmInitialized = true;
    }

    const { pdfBuffer } = e.data;
    const uint8Array = new Uint8Array(pdfBuffer);
    const boundingBoxes = extract_spatial_bounding_boxes(uint8Array);

    self.postMessage({ status: 'success', data: boundingBoxes });
  } catch (error: any) {
    self.postMessage({ status: 'error', error: error?.message || 'WASM PDF parsing failed' });
  }
};
