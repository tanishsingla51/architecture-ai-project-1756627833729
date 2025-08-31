import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp');
  },
  filename: function (req, file, cb) {
    // In a real app, you might want to add a unique suffix
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage });
