/* =========================================================
   STICKER MAKER
   script.js
   ========================================================= */


/* =========================
   ELEMENTS
========================= */

const fileInput = document.getElementById("fileInput");
const uploadBox = document.getElementById("uploadBox");

const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");

const statusBox = document.getElementById("status");

const previewContainer =
  document.getElementById("previewContainer");

const canvas =
  document.getElementById("stickerCanvas");

const ctx =
  canvas.getContext("2d", {
    alpha: true
  });

const actions =
  document.getElementById("actions");

const downloadBtn =
  document.getElementById("downloadBtn");

const shareBtn =
  document.getElementById("shareBtn");

const whatsappBtn =
  document.getElementById("whatsappBtn");

const resetBtn =
  document.getElementById("resetBtn");


/* =========================
   STATE
========================= */

let stickerBlob = null;
let originalFile = null;


/* =========================
   CONFIG
========================= */

const API_ENDPOINT =
  "/api/remove-background";


/* =========================
   INITIAL STATE
========================= */

hideElement(loading);
hideElement(statusBox);
hideElement(previewContainer);
hideElement(actions);


/* =========================
   FILE INPUT
========================= */

fileInput.addEventListener(
  "change",
  async (event) => {

    const file =
      event.target.files?.[0];

    if (!file) return;

    await handleFile(file);

  }
);


/* =========================
   CLICK UPLOAD
========================= */

uploadBox.addEventListener(
  "click",
  () => {

    fileInput.click();

  }
);


/* =========================
   HANDLE FILE
========================= */

async function handleFile(file) {

  try {

    validateFile(file);

    originalFile = file;

    resetOutput();

    showLoading(
      "Mempersiapkan foto..."
    );

    const result =
      await removeBackground(file);

    showLoading(
      "Membuat sticker..."
    );

    const image =
      await blobToImage(result);

    drawSticker(image);

    showLoading(
      "Menghasilkan file WebP..."
    );

    stickerBlob =
      await canvasToWebP();

    hideElement(loading);

    showElement(previewContainer);
    showElement(actions);

    showStatus(
      "✅ Sticker berhasil dibuat!"
    );

    uploadBox.style.display =
      "none";

  } catch (error) {

    console.error(
      "Sticker Maker Error:",
      error
    );

    hideElement(loading);

    showStatus(
      getErrorMessage(error),
      true
    );

  }

}


/* =========================
   VALIDATE FILE
========================= */

function validateFile(file) {

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (
    !allowedTypes.includes(
      file.type
    )
  ) {

    throw new Error(
      "Format foto harus JPG, PNG atau WEBP."
    );

  }


  const maxSize =
    10 * 1024 * 1024;


  if (
    file.size > maxSize
  ) {

    throw new Error(
      "Ukuran foto maksimal 10 MB."
    );

  }

}


/* =========================
   REMOVE BACKGROUND API
========================= */

async function removeBackground(file) {

  const formData =
    new FormData();

  formData.append(
    "image",
    file,
    file.name
  );


  const response =
    await fetch(
      API_ENDPOINT,
      {
        method: "POST",
        body: formData
      }
    );


  if (!response.ok) {

    let message =
      "Gagal menghapus background.";

    try {

      const data =
        await response.json();

      if (data?.error) {

        message =
          data.error;

      }

    } catch (_) {}

    throw new Error(message);

  }


  const blob =
    await response.blob();


  if (
    !blob.type.startsWith(
      "image/"
    )
  ) {

    throw new Error(
      "Server tidak mengembalikan gambar."
    );

  }


  return blob;

}


/* =========================
   BLOB TO IMAGE
========================= */

function blobToImage(blob) {

  return new Promise(
    (resolve, reject) => {

      const url =
        URL.createObjectURL(blob);

      const image =
        new Image();

      image.onload = () => {

        URL.revokeObjectURL(
          url
        );

        resolve(image);

      };


      image.onerror = () => {

        URL.revokeObjectURL(
          url
        );

        reject(
          new Error(
            "Gagal membaca hasil gambar."
          )
        );

      };


      image.src = url;

    }
  );

}


/* =========================
   DRAW STICKER
========================= */

function drawSticker(image) {

  const SIZE = 512;

  canvas.width =
    SIZE;

  canvas.height =
    SIZE;


  ctx.clearRect(
    0,
    0,
    SIZE,
    SIZE
  );


  /*
    Pertahankan rasio gambar.
  */

  const sourceWidth =
    image.naturalWidth ||
    image.width;

  const sourceHeight =
    image.naturalHeight ||
    image.height;


  const scale =
    Math.min(
      SIZE / sourceWidth,
      SIZE / sourceHeight
    );


  const width =
    Math.round(
      sourceWidth * scale
    );

  const height =
    Math.round(
      sourceHeight * scale
    );


  const x =
    Math.round(
      (SIZE - width) / 2
    );

  const y =
    Math.round(
      (SIZE - height) / 2
    );


  /*
    Pastikan canvas transparan.
  */

  ctx.clearRect(
    0,
    0,
    SIZE,
    SIZE
  );


  ctx.drawImage(
    image,
    x,
    y,
    width,
    height
  );

}


/* =========================
   CANVAS TO WEBP
========================= */

function canvasToWebP() {

  return new Promise(
    (resolve, reject) => {

      canvas.toBlob(
        (blob) => {

          if (!blob) {

            reject(
              new Error(
                "Gagal membuat file WebP."
              )
            );

            return;

          }

          resolve(blob);

        },
        "image/webp",
        0.95
      );

    }
  );

}


/* =========================
   DOWNLOAD
========================= */

downloadBtn.addEventListener(
  "click",
  async () => {

    if (!stickerBlob) {

      showStatus(
        "Sticker belum tersedia.",
        true
      );

      return;

    }


    try {

      const fileName =
        createFileName();


      const url =
        URL.createObjectURL(
          stickerBlob
        );


      const link =
        document.createElement(
          "a"
        );


      link.href =
        url;

      link.download =
        fileName;


      document.body.appendChild(
        link
      );

      link.click();

      link.remove();


      setTimeout(
        () => {

          URL.revokeObjectURL(
            url
          );

        },
        1000
      );


      showStatus(
        "✅ Sticker berhasil didownload."
      );

    } catch (error) {

      console.error(error);

      showStatus(
        "❌ Gagal mendownload sticker.",
        true
      );

    }

  }
);


/* =========================
   SHARE FILE
========================= */

shareBtn.addEventListener(
  "click",
  async () => {

    await shareSticker(
      "Sticker Maker"
    );

  }
);


/* =========================
   WHATSAPP SHARE
========================= */

whatsappBtn.addEventListener(
  "click",
  async () => {

    await shareSticker(
      "Sticker WhatsApp"
    );

  }
);


/* =========================
   SHARE STICKER
========================= */

async function shareSticker(
  title
) {

  if (!stickerBlob) {

    showStatus(
      "Sticker belum tersedia.",
      true
    );

    return;

  }


  const file =
    new File(
      [
        stickerBlob
      ],
      createFileName(),
      {
        type:
          "image/webp"
      }
    );


  /*
    Browser yang mendukung
    Web Share + file sharing.
  */

  if (
    navigator.share &&
    navigator.canShare
  ) {

    try {

      const canShare =
        navigator.canShare({
          files: [file]
        });


      if (canShare) {

        await navigator.share({

          title: title,

          text:
            "Sticker buatan saya 😎",

          files: [file]

        });


        return;

      }

    } catch (error) {

      /*
        User menekan cancel.
      */

      if (
        error.name ===
        "AbortError"
      ) {

        return;

      }

      console.error(
        "Share error:",
        error
      );

    }

  }


  /*
    Fallback jika browser
    tidak mendukung file sharing.
  */

  await fallbackShare();

}


/* =========================
   FALLBACK SHARE
========================= */

async function fallbackShare() {

  /*
    Download file terlebih dahulu.
  */

  const url =
    URL.createObjectURL(
      stickerBlob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;

  link.download =
    createFileName();


  document.body.appendChild(
    link
  );

  link.click();

  link.remove();


  setTimeout(
    () => {

      URL.revokeObjectURL(
        url
      );

    },
    1000
  );


  /*
    Kemudian buka WhatsApp.
  */

  setTimeout(
    () => {

      const text =
        encodeURIComponent(
          "Saya baru membuat sticker 😎"
        );


      window.open(
        "https://wa.me/?text=" +
        text,
        "_blank"
      );

    },
    700
  );


  showStatus(
    "Sticker didownload. Pilih file tersebut di WhatsApp untuk mengirimkannya."
  );

}


/* =========================
   RESET
========================= */

resetBtn.addEventListener(
  "click",
  () => {

    resetApp();

  }
);


/* =========================
   RESET APP
========================= */

function resetApp() {

  fileInput.value =
    "";

  originalFile =
    null;

  stickerBlob =
    null;


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  hideElement(
    previewContainer
  );

  hideElement(
    actions
  );

  hideElement(
    loading
  );

  hideElement(
    statusBox
  );


  uploadBox.style.display =
    "flex";

}


/* =========================
   RESET OUTPUT
========================= */

function resetOutput() {

  stickerBlob =
    null;


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  hideElement(
    previewContainer
  );

  hideElement(
    actions
  );

  hideElement(
    statusBox
  );

}


/* =========================
   LOADING
========================= */

function showLoading(
  message
) {

  loadingText.textContent =
    message;

  showElement(
    loading
  );

}


/* =========================
   STATUS
========================= */

function showStatus(
  message,
  isError = false
) {

  statusBox.textContent =
    message;


  statusBox.style.display =
    "block";


  if (isError) {

    statusBox.style.borderColor =
      "rgba(239,68,68,.35)";

    statusBox.style.color =
      "#fca5a5";

  } else {

    statusBox.style.borderColor =
      "rgba(37,211,102,.2)";

    statusBox.style.color =
      "#a7f3d0";

  }

}


/* =========================
   SHOW / HIDE
========================= */

function showElement(
  element
) {

  element.style.display =
    "";

}


function hideElement(
  element
) {

  element.style.display =
    "none";

}


/* =========================
   FILE NAME
========================= */

function createFileName() {

  const timestamp =
    Date.now();

  return (
    "sticker-" +
    timestamp +
    ".webp"
  );

}


/* =========================
   ERROR MESSAGE
========================= */

function getErrorMessage(
  error
) {

  if (
    error?.message
  ) {

    return (
      "❌ " +
      error.message
    );

  }


  return (
    "❌ Terjadi kesalahan. Silakan coba lagi."
  );

}


/* =========================
   DRAG & DROP
========================= */

[
  "dragenter",
  "dragover"
].forEach(
  eventName => {

    uploadBox.addEventListener(
      eventName,
      event => {

        event.preventDefault();

        uploadBox.classList.add(
          "dragging"
        );

      }
    );

  }
);


[
  "dragleave",
  "drop"
].forEach(
  eventName => {

    uploadBox.addEventListener(
      eventName,
      event => {

        event.preventDefault();

        uploadBox.classList.remove(
          "dragging"
        );

      }
    );

  }
);


uploadBox.addEventListener(
  "drop",
  async event => {

    const file =
      event.dataTransfer
        ?.files?.[0];


    if (!file) return;


    await handleFile(
      file
    );

  }
);
