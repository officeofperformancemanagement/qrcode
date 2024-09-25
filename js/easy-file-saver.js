/*
    - Should we support Zip or GZip? Don't import JSZip, but allow people to pass zip object  save({ data: zip, "archive.zip" });
    - Should we docx like zip or gzip? - maybe check how large that would make the package if we did
    - Or is there a way to add some form of partial support for it only if the user has a need for it? Through multiple bundles?
    - Is there anyway to auto-detect if they are using webpack or rollup??
    - How do we support SVG?
    - How do we support XML, CSS and such?
    - Should we use papa.unparse? - does it make library too heavy? should it be a required or optional dep?
    - Add geotiff? dchar?
    - Add support for PDF object
*/

function saveFile({ data, debug, filename }) {
  if (debug) console.log("[easy-file-saver] starting with ", { data, debug, filename });
  if (!data) throw new Error("[easy-file-save] You must pass in data");
  if (!filename) {
    if (typeof window !== "undefined" && typeof File !== undefined && data instanceof File) {
      filename = data.name;
    }
    throw new Error("[easy-file-save] You must pass in filename");
  }

  const constructorName = (typeof data === "object" && typeof data.constructor === "function" && data.constructor.name) || null;
  if (debug) console.log("constructorName:", constructorName);

  const ext = filename.substr(filename.lastIndexOf(".")).toLowerCase();

  const ext_to_mimetype = {
    csv: "text/csv",
    geojson: "application/json",
    jpg: "image/jpeg",
    json: "application/json",
    png: "image/png",
    pdf: "application/pdf",
    svg: "image/svg+xml",
    tsv: "text/csv",
    txt: "text/plain",
    xlsx: "application/vnd.ms-excel",
    zip: "application/zip"
  };

  const mime_type = ext_to_mimetype[ext] || "application/octet-stream";

  const A = ({ href, download }) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = download;
    return a;
  };

  function convertImageToCanvas({ debug, img }) {
    if (debug) console.log("[easy-file-saver] starting convertImageToCanvas");
    const height = img.height;
    const width = img.width;
    const canvas = document.createElement("canvas");
    canvas.height = height;
    canvas.width = width;
    const context = canvas.getContext("2d");
    context.drawImage(img, 0, 0, width, height);
    return canvas;
  }

  function saveHTML({ data, debug, filename }) {
    if (typeof data === "object" && "outerHTML" in data) {
      if (debug) console.log("[easy-file-saver] data appears to be an HTML element, so grabbing it's outer HTML");
      data = data.outerHTML;
    }
    const url = "data:text/html," + encodeURIComponent(data);
    saveDataOrBlobURL({ url, debug, filename });
  }

  function saveCanvas({ data, debug, filename, imageType }) {
    const url = data.toDataURL("image/" + imageType);
    saveDataOrBlobURL({ url, debug, filename });
  }

  function saveDataOrBlobURL({ url, debug, filename }) {
    A({ href: url, download: filename }).click();
  }

  function saveImageAsJPG({ data: img, debug, filename }) {
    if (debug) console.log("starting saveImageAsJPG");
    const canvas = convertImageToCanvas({ debug, img });
    saveCanvasAsJPG({ data: canvas, debug, filename });
  }

  function saveImageAsPNG({ data: img, debug, filename }) {
    if (debug) console.log("starting saveImageAsPNG");
    const canvas = convertImageToCanvas({ debug, img });
    saveCanvasAsPNG({ data: canvas, debug, filename });
  }

  function saveImageAsWebP({ data: img, debug, filename }) {
    if (debug) console.log("starting saveImageAsWebP");
    const canvas = convertImageToCanvas({ debug, img });
    saveCanvasAsWebP({ data: canvas, debug, filename });
  }

  function saveCanvasAsJPG({ data, debug, filename }) {
    saveCanvas({ data, debug, filename, imageType: "jpeg" });
  }

  function saveCanvasAsPNG({ data, debug, filename }) {
    saveCanvas({ data, debug, filename, imageType: "png" });
  }

  function saveCanvasAsWebP({ data, debug, filename }) {
    saveCanvas({ data, debug, filename, imageType: "webp" });
  }

  function saveDSV({ data, debug, delimiter, filename, mediatype }) {
    if (!Array.isArray(data)) throw new Error("[easy-saver] data must be an array to save as a CSV");
    if (!delimiter) throw new Error("[easy-saver] delimiter must be set");
    if (!mediatype) throw new Error("[easy-saver] mediatype must be set");
    let output = "data:" + mediatype + ";charset=utf-8,";
    const columns = Array.from(new Set(data.map(Object.keys).flat())).sort();
    const types = new Set(data.map(it => (Array.isArray(it) ? "array" : typeof it)));
    const includeHeader = types.has("object");
    if (debug) console.log("includeHeader:", includeHeader);
    if (includeHeader) output += columns.map(c => '"' + c.replace(/,/g, "\\,") + '"') + "\n";
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (i !== 0) output += "\n";
      output += columns.map(col => '"' + row[col].toString().replace(/,/g, "\\,") + '"');
    }
    const url = encodeURI(output);
    saveDataOrBlobURL({ url, debug, filename });
  }

  function saveCSV({ data, debug, filename }) {
    saveDSV({ data, debug, delimiter: ",", filename, mediatype: "text/csv" });
  }

  function saveTSV({ data, debug, filename }) {
    saveDSV({ data, debug, delimiter: "\t", filename, mediatype: "text/tab-separated-values" });
  }

  function saveJSON({ data, debug, filename }) {
    const url = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, undefined, 2));
    saveDataOrBlobURL({ url, debug, filename });
  }

  function saveText({ data, debug, filename }) {
    const url = "data:text/plain;charset=utf-8," + encodeURIComponent(data);
    saveDataOrBlobURL({ url, debug, filename });
  }

  function saveBlob({ data, debug, filename }) {
    const url = URL.createObjectURL(data);
    if (debug) console.log("[easy-file-saver.saveBlob] url:", url);
    saveDataOrBlobURL({ url, debug, filename });
    URL.revokeObjectURL(url);
  }

  function saveBlobbable({ data, debug, filename, type }) {
    const blob = new Blob([data], { type: type || mime_type });
    saveBlob({ data: blob, debug, filename });
  }

  if (ext === ".csv") {
    saveCSV({ data, debug, filename });
  } else if (ext === ".tsv") {
    saveTSV({ data, debug, filename });
  } else if (ext === ".html") {
    saveHTML({ data, debug, filename });
  } else if (ext === ".json" || ext === ".geojson" || ext === ".topojson") {
    saveJSON({ data, debug, filename });
  } else if (ext === ".txt" || ext === ".js" || ext === ".py") {
    saveText({ data, debug, filename });
  } else if (constructorName === "HTMLCanvasElement" && ext === ".png") {
    saveCanvasAsPNG({ data, debug, filename });
  } else if (constructorName === "HTMLCanvasElement" && ext === ".jpg") {
    saveCanvasAsJPG({ data, debug, filename });
  } else if (constructorName === "HTMLCanvasElement" && ext === ".webp") {
    saveCanvasAsWebP({ data, debug, filename });
  } else if (constructorName === "HTMLImageElement" && ext === ".jpg") {
    saveImageAsJPG({ data, debug, filename });
  } else if (constructorName === "HTMLImageElement" && ext === ".png") {
    saveImageAsPNG({ data, debug, filename });
  } else if (constructorName === "HTMLImageElement" && ext === ".webp") {
    saveImageAsWebP({ data, debug, filename });
  } else if (constructorName === "Blob") {
    saveBlob({ data, debug, filename });
  } else if (constructorName === "ArrayBuffer" || constructorName === "Uint8Array") {
    saveBlobbable({ data, debug, filename })
  } else {
    throw new Error('[easy-file-saver] unrecognized extension "' + ext + '"');
  }
}

if (typeof define === "function" && define.amd)
  define(function () {
    return saveFile;
  });
if (typeof module === "object") module.exports = saveFile;
if (typeof window === "object") window.saveFile = saveFile;
if (typeof self === "object") self.saveFile = saveFile;
