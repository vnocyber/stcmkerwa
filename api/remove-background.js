// =========================================================
// STICKER MAKER
// api/remove-background.js
//
// Vercel Serverless Function
//
// Environment Variable yang diperlukan:
//
// REMOVE_BG_API_KEY=API_KEY_KAMU
//
// Jangan pernah menaruh API key di index.html
// atau script.js.
// =========================================================

export const config = {
  api: {
    bodyParser: false
  }
};


/* =========================================================
   MAIN HANDLER
========================================================= */

export default async function handler(req, res) {

  /*
   * Hanya menerima POST
   */

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method tidak diizinkan."
    });

  }


  /*
   * Pastikan API key tersedia
   */

  const apiKey =
    process.env.REMOVE_BG_API_KEY;


  if (!apiKey) {

    console.error(
      "REMOVE_BG_API_KEY belum dikonfigurasi."
    );

    return res.status(500).json({
      error:
        "Server belum dikonfigurasi untuk menghapus background."
    });

  }


  try {

    /*
     * Membaca multipart/form-data
     */

    const body =
      await readRequestBody(req);


    /*
     * Cari file gambar
     */

    const image =
      extractImage(body);


    if (!image) {

      return res.status(400).json({
        error:
          "Foto tidak ditemukan."
      });

    }


    /*
     * Validasi ukuran
     */

    const maxSize =
      10 * 1024 * 1024;


    if (
      image.data.length >
      maxSize
    ) {

      return res.status(413).json({
        error:
          "Ukuran foto maksimal 10 MB."
      });

    }


    /*
     * Kirim foto ke Remove.bg
     */

    const formData =
      new FormData();


    const blob =
      new Blob(
        [
          image.data
        ],
        {
          type:
            image.contentType
        }
      );


    formData.append(
      "image_file",
      blob,
      image.filename
    );


    /*
     * Ukuran hasil maksimum 512px.
     *
     * Cocok untuk sticker WhatsApp.
     */

    formData.append(
      "size",
      "512"
    );


    const response =
      await fetch(
        "https://api.remove.bg/v1.0/removebg",
        {
          method: "POST",

          headers: {
            "X-Api-Key":
              apiKey
          },

          body:
            formData
        }
      );


    /*
     * Jika Remove.bg gagal
     */

    if (!response.ok) {

      let errorMessage =
        "Gagal menghapus background.";

      try {

        const errorText =
          await response.text();

        if (errorText) {

          errorMessage =
            errorText;

        }

      } catch (_) {}


      console.error(
        "Remove.bg error:",
        response.status,
        errorMessage
      );


      return res.status(502).json({
        error:
          "Layanan penghapus background gagal memproses foto."
      });

    }


    /*
     * Ambil hasil PNG transparan
     */

    const result =
      Buffer.from(
        await response.arrayBuffer()
      );


    /*
     * Kirim kembali ke browser
     */

    res.setHeader(
      "Content-Type",
      "image/png"
    );


    res.setHeader(
      "Content-Length",
      result.length
    );


    res.setHeader(
      "Cache-Control",
      "no-store"
    );


    return res.status(200).send(
      result
    );


  } catch (error) {

    console.error(
      "Remove background error:",
      error
    );


    return res.status(500).json({
      error:
        "Terjadi kesalahan pada server."
    });

  }

}


/* =========================================================
   READ REQUEST BODY
========================================================= */

async function readRequestBody(req) {

  const chunks = [];


  for await (
    const chunk of req
  ) {

    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );

  }


  return Buffer.concat(
    chunks
  );

}


/* =========================================================
   EXTRACT IMAGE
========================================================= */

function extractImage(buffer) {

  /*
   * Karena request berasal dari FormData,
   * kita mengambil file multipart secara manual.
   */

  const body =
    buffer.toString(
      "latin1"
    );


  /*
   * Cari boundary dari body.
   */

  const firstLineEnd =
    body.indexOf("\r\n");


  if (
    firstLineEnd === -1
  ) {

    return null;

  }


  const boundary =
    body.substring(
      2,
      firstLineEnd
    );


  const boundaryBuffer =
    Buffer.from(
      "--" + boundary
    );


  let start =
    buffer.indexOf(
      Buffer.from(
        "\r\n\r\n"
      )
    );


  if (
    start === -1
  ) {

    return null;

  }


  start += 4;


  /*
   * Cari boundary berikutnya.
   */

  let end =
    buffer.indexOf(
      boundaryBuffer,
      start
    );


  if (
    end === -1
  ) {

    return null;

  }


  /*
   * Buang CRLF sebelum boundary.
   */

  if (
    end >= 2 &&
    buffer[end - 2] === 13 &&
    buffer[end - 1] === 10
  ) {

    end -= 2;

  }


  /*
   * Ambil header multipart.
   */

  const headerEnd =
    body.indexOf(
      "\r\n\r\n"
    );


  const headerText =
    body.substring(
      0,
      headerEnd
    );


  /*
   * Nama file.
   */

  const filenameMatch =
    headerText.match(
      /filename="([^"]+)"/i
    );


  const filename =
    filenameMatch
      ? filenameMatch[1]
      : "sticker-image";


  /*
   * Content type.
   */

  const contentTypeMatch =
    headerText.match(
      /Content-Type:\s*([^\r\n]+)/i
    );


  const contentType =
    contentTypeMatch
      ? contentTypeMatch[1].trim()
      : "image/jpeg";


  const data =
    buffer.subarray(
      start,
      end
    );


  /*
   * Pastikan yang dikirim adalah gambar.
   */

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];


  if (
    !allowedTypes.includes(
      contentType
    )
  ) {

    return null;

  }


  return {

    filename,

    contentType,

    data

  };

        }
