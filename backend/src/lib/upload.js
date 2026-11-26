const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('./config');
const { badRequest } = require('./errors');

fs.mkdirSync(config.uploadDir, { recursive: true });

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ALLOWED[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(badRequest('Only JPG, PNG, WEBP, GIF or AVIF images are allowed'));
    cb(null, true);
  },
});

// Check magic bytes so a renamed non-image file is rejected even if the MIME header lies.
function looksLikeImage(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  const hex = buf.toString('hex');
  return (
    hex.startsWith('ffd8ff') || // jpeg
    hex.startsWith('89504e47') || // png
    hex.startsWith('47494638') || // gif
    (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') ||
    buf.toString('ascii', 4, 12).startsWith('ftypavi')
  );
}

function verifyUploaded(files) {
  const list = Array.isArray(files) ? files : files ? [files] : [];
  for (const f of list) {
    if (!looksLikeImage(f.path)) {
      list.forEach((x) => fs.rm(x.path, { force: true }, () => {}));
      throw badRequest('Uploaded file is not a valid image');
    }
  }
  return list.map((f) => `/uploads/${path.basename(f.path)}`);
}

function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const file = path.join(config.uploadDir, path.basename(url));
  fs.rm(file, { force: true }, () => {});
}

module.exports = { upload, verifyUploaded, removeUpload };
