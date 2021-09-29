import express from "express";
import cors from "cors";
import knex from "knex";
import bodyParser from "body-parser";
import bcrypt from "bcrypt-nodejs";

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "",
    database: "artoncanvas",
  },
});

const app = express();
const port = process.env.PORT;

app.get("/", function (req, res) {
  res.send(`Server is working on ${port}`);
});

app.use(bodyParser.json());
app.use(cors());

app.get("/api/product", (req, res) => {
  db.select("*")
    .from("public.products")
    .then((products) => {
      res.json(products);
    });
});

app.get("/api/product/:id", (req, res) => {
  const { id } = req.params;
  db.select("*")
    .from("products")
    .where({ id })
    .then((products) => {
      res.json(products[0]);
    })
    .catch((err) => res.status(400).json("Error getting product"));
});

app.post("/signin", (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !password) {
    return res.status(401).json("Eroare");
  }

  db.select("email", "hash")
    .from("login")
    .where("email", "=", req.body.email)
    .then((data) => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      if (isValid) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", req.body.email)
          .then((user) => {
            res.json(user[0]);
          })
          .catch((err) => res.status(400).json("unable to register"));
      } else {
        res.status(400).json("wrong credentials");
      }
    })
    .catch((err) => res.status(400).json("wrong credentials"));
});

app.post("/register", (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json("Eroare");
  }

  const hash = bcrypt.hashSync(password);
  db.transaction((trx) => {
    trx
      .insert({
        hash: hash,
        email: email,
      })
      .into("login")
      .returning("email")
      .then((loginEmail) => {
        return trx("users")
          .returning("*")
          .insert({
            email: loginEmail[0],
            name: name,
          })
          .then((user) => {
            res.json(user[0]);
          });
      })
      .then(trx.commit)
      .catch(trx.rollback);
  }).catch((err) => res.status(400).json("unable to register"));
});

app.put("/profile/:id", (req, res) => {
  const { password, email, name } = req.body;

  const hash = bcrypt.hashSync(password);
  db("users")
    .where("id", "=", req.params.id)
    .update({
      email: email,
      name: name,
    })
    .returning("users")
    .then((users) => res.json(users[0]))
    .catch((err) => res.status(408).json("Valid"));

  db("login")
    .where("id", "=", req.params.id)
    .update({
      email: email,
      name: name,
      hash: hash,
    })
    .returning("login")
    .then((login) => res.json(login[0]))
    .catch((err) => res.status(409).json("Valid"));
});

app.post("/api/order", (req, res) => {
  const order = {
    orderItems: req.body.orderItems,
    shipping: req.body.shipping,
    payment: req.body.payment,
    itemsPrice: req.body.itemsPrice,
    taxPrice: req.body.taxPrice,
    shippingPrice: req.body.shippingPrice,
    totalPrice: req.body.totalPrice,
  };
  console.log(order);
  const hash = bcrypt.hashSync(order);
  db("orders")
    .returning("*")
    .insert({
      order: hash,
    })
    .then((order) => {
      console.log(order);
      if (order) {
        return res.status(200).json("Valid");
      }
    })
    .catch((err) => res.status(200).json("Invalid"));
});

app.listen(port || 1998, () => {
  console.log(`Server working on ${port}`);
});
