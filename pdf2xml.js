const pdfjs_lib = require("pdfjs-dist/legacy/build/pdf.js");
const fs = require("fs");
const args = require('minimist')(process.argv.slice(2))

// Some PDFs need external cmaps.
const CMAP_URL = "./node_modules/pdfjs-dist/cmaps/";
const CMAP_PACKED = true;

// Where the standard fonts are located.
const STANDARD_FONT_DATA_URL =
    "./node_modules/pdfjs-dist/standard_fonts/";

// Default path
const DEFAULT_PATH = './docs/005.pdf';

const pdf_path = args.path || DEFAULT_PATH;

const data = new Uint8Array(fs.readFileSync(pdf_path));

// Load the PDF file.
const loading_task = pdfjs_lib.getDocument({
    data,
    disableRange: true,
    disableWorker: true,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
});
console.log(args.path);

(async function () {
    try {
        const pdf_document = await loading_task.promise;

        for (let i = 7; i <= pdf_document.numPages; i++) {
            // Required to prevent that i is always the total of pages
            pdf_document.getPage(i).then(function (page) {
                let viewport = page.getViewport({scale: 1});
                console.log(viewport.width, viewport.height)
                page.getTextContent().then(function (text_content) {
                    text_content.items.forEach(function (text_item) {
                        let tx = pdfjs_lib.Util.transform(
                            pdfjs_lib.Util.transform(viewport.transform, text_item.transform),
                            [1, 0, 0, -1, 0, 0]
                        );
                        let style = text_content.styles[text_item.fontName];

                        // adjust for font ascent/descent
                        let font_size = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));

                        if (style.ascent) {
                            tx[5] -= font_size * style.ascent;
                        } else if (style.descent) {
                            tx[5] -= font_size * (1 + style.descent);
                        } else {
                            tx[5] -= font_size / 2;
                        }

                        // adjust for rendered width
                        console.log({
                            "text_content": text_item.str,
                            "font_family": style.fontFamily,
                            "font_size": font_size + 'px',
                            // "transform": 'scaleX(' + tx[0] + ')',
                            "left": tx[4] + 'px',
                            "top": tx[5] + 'px',
                            "with": text_item.width + 'px',
                            "height": text_item.height + 'px',
                        })
                    })
                })
            })
        }
    } catch (reason) {
        console.log(reason);
    }
})();
