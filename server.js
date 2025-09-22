const jsonServer = require("json-server");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults({
  static: "public", // serve public folder
});

server.use(middlewares);

// buat folder images kalau belum ada
const dir = "./public/images";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Storage multer untuk upload file image
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images");
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${file.originalname}`;
    req.body.imageFilename = filename;
    cb(null, filename);
  },
});

const upload = multer({ storage: storage });

// JSON parser
server.use(jsonServer.bodyParser);

// GET /products/:id
server.get("/products/:id", (req, res) => {
  const id = Number(req.params.id); // pastikan id angka
  const db = router.db.getState();
  const product = db.products.find((p) => Number(p.id) === id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

// POST /products
server.post("/products", upload.single("image"), (req, res) => {
  const body = req.body;
  const errors = {};
  let hasErrors = false;

  if (body.price) body.price = Number(body.price);

  if (!body.name || body.name.length < 2) {
    hasErrors = true;
    errors.name = "Name minimal 2 karakter";
  }
  if (!body.brand || body.brand.length < 2) {
    hasErrors = true;
    errors.brand = "Brand minimal 2 karakter";
  }
  if (!body.category || body.category.length < 2) {
    hasErrors = true;
    errors.category = "Category minimal 2 karakter";
  }
  if (!body.price || body.price <= 0) {
    hasErrors = true;
    errors.price = "Price harus lebih dari 0";
  }
  if (!body.description || body.description.length < 10) {
    hasErrors = true;
    errors.description = "Description minimal 10 karakter";
  }

  if (hasErrors) {
    return res.status(400).json({ message: "Validation error", errors });
  }

  body.createdAt = new Date().toISOString();
  body.imageFilename = req.file?.filename ?? body.imageFilename;

  // simpan ke db.json dengan id angka berurutan
  const db = router.db.get("products");
  const newId = db.value().length
    ? Math.max(...db.value().map((p) => Number(p.id))) + 1
    : 1;
  body.id = newId;

  db.push(body).write();

  res.status(201).json(body);
});

// PATCH /products/:id
server.patch("/products/:id", upload.single("image"), (req, res) => {
  const id = Number(req.params.id); // pastikan id angka
  const db = router.db.get("products");
  const product = db.find({ id }).value();

  if (!product) return res.status(404).json({ message: "Product not found" });

  const { name, brand, category, description, price } = req.body;

  db.find({ id })
    .assign({
      name: name ?? product.name,
      brand: brand ?? product.brand,
      category: category ?? product.category,
      description: description ?? product.description,
      price: price ? Number(price) : product.price,
      imageFilename: req.file?.filename ?? product.imageFilename,
    })
    .write();

  res.json(db.find({ id }).value());
});

// gunakan router default JSON Server
server.use(router);

// jalankan server
server.listen(5000, () => {
  console.log("JSON Server running on port 5000");
});
