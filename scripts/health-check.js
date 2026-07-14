import http from "node:http";

const url = process.argv[2] || "http://localhost:4001/";

http.get(url, (response) => {
  let body = "";

  response.on("data", (chunk) => {
    body += chunk;
  });

  response.on("end", () => {
    console.log(`Health check request to ${url}`);
    console.log(`Status: ${response.statusCode}`);
    console.log("Response body:", body);
    process.exit(response.statusCode === 200 ? 0 : 1);
  });
}).on("error", (error) => {
  console.error(`Health check failed for ${url}`);
  console.error(error);
  process.exit(1);
});
