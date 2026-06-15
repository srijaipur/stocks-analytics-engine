import express from "express";

console.log("STEP 1: importing express");

const app = express();

console.log("STEP 2: app created");
console.log("STEP 2A: app._router initially:", app._router);

app.get("/test", (req, res) => {
  res.send("OK");
});

console.log("STEP 3: after route");
console.log("STEP 3A: app._router exists?", !!app._router);
console.log(
  "STEP 3B: routes snapshot:",
  app._router?.stack?.map(l => l.route?.path).filter(Boolean)
);

app.listen(3001, () => {
  console.log("PURE EXPRESS RUNNING ON 3001");
});