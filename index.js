const fs = require("fs");
const https = require("https");
const path = require("path");
const puppeteer = require("puppeteer");
const cliProgress = require("cli-progress"); // Install using: npm install cli-progress

const fontTypes = [
  "Ultra Condensed",
  "Condensed",
  "Default",
  "Extended",
  "Ultra Extended",
];

const fontWeights = [
  "Thin",
  "Light",
  "Book",
  "Regular",
  "Medium",
  "Semi Bold",
  "Bold",
  "Black",
];

async function downloadFont(name, type = "Default", weight = "Regular") {
  let fontTypeArray =
    type === "*" ? fontTypes : Array.isArray(type) ? type : [type];
  let fontWeightArray =
    weight === "*" ? fontWeights : Array.isArray(weight) ? weight : [weight];

  const formattedFontTypes = fontTypeArray.map((font) =>
    font.replace(/ /g, "-").toLowerCase()
  );
  const formattedFontWeights = fontWeightArray.map((font) =>
    font.replace(/ /g, "-").toLowerCase()
  );

  const fontName = name.replace(/ /g, "-").toLowerCase();
  const mainLink = `https://store.typenetwork.com/foundry/universalthirst/fonts/${fontName}/`;

  if (!(await checkLink(mainLink))) {
    return console.log("❌ Font not found:", capitalizeWords(name));
  }

  console.log(
    `\n📥 Starting Font Download: ${capitalizeWords(
      name
    )} (${type}, ${weight})\n`
  );

  const browser = await puppeteer.launch({ headless: true });
  let totalDownloads = formattedFontTypes.length * formattedFontWeights.length;
  let completedDownloads = 0;
  let skippedDownloads = 0;

  const progressBar = new cliProgress.SingleBar(
    {
      format: " {bar} {percentage}% | ETA: {eta}s | {value}/{total}\n\n",
      clearOnComplete: false,
    },
    cliProgress.Presets.shades_classic
  );

  progressBar.start(totalDownloads, 0);

  for (let fontType of formattedFontTypes) {
    fontType = fontType === "default" ? "" : fontType + "-";

    for (let fontWeight of formattedFontWeights) {
      const link = `https://store.typenetwork.com/foundry/universalthirst/fonts/${fontName}/${fontType}${fontWeight}`;
      const skipped = await downloader(
        browser,
        link,
        name,
        fontType,
        fontWeight
      );

      if (skipped) {
        skippedDownloads++;
      } else {
        completedDownloads++;
      }

      progressBar.update(completedDownloads + skippedDownloads);
    }

    console.log(
      `✅ Completed downloading all weights for Type: ${
        capitalizeWords(fontType.replace(/-/g, " ").trim()) || "Default"
      }\n`
    );
  }

  progressBar.stop();
  await browser.close();
  console.log("✅ Download Completed for all selected font types and weights.");
}

async function downloader(browser, link, name, type, weight) {
  const displayName = `${capitalizeWords(name)} ${capitalizeWords(
    type.replace(/-/g, " ").trim()
  )} ${capitalizeWords(weight.replace(/-/g, " "))}`.trim();

  const fileName = `${name.replace(/ /g, "-")}-${type}${weight}.woff2`
    .replace(/ /g, "")
    .replace(/--/g, "-")
    .toLowerCase();

  const formattedName = capitalizeWords(name.replace(/-/g, " "));
  const formattedType =
    capitalizeWords(type.replace(/-/g, " ").trim()) || formattedName;
  const downloadPath = path.resolve(
    "fonts",
    formattedName,
    formattedType,
    fileName
  );

  if (fs.existsSync(downloadPath)) {
    console.log(`⏭️  Skipping (Already Exists): ${displayName}`);
    return true;
  }

  if (!(await checkLink(link))) {
    console.log(`❌ Font not found: ${displayName}`);
    return false;
  }

  const page = await browser.newPage();

  async function requestListener(request) {
    const url = request.url();
    if (url.includes("woff2")) {
      console.log(`⬇️ Downloading: ${displayName}`);
      await downloadFile(url, downloadPath);
      console.log(`✅ Downloaded: ${displayName}\n`);
      page.off("request", requestListener);
    }
  }

  page.on("request", requestListener);
  page.on("error", (error) => console.log("❌ Page error:", error));

  await page.goto(link, { timeout: 0, waitUntil: "networkidle2" });
  await page.close();

  return false;
}

async function checkLink(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.end();
  });
}

async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    fs.promises
      .mkdir(path.dirname(filePath), { recursive: true })
      .then(() => {
        const fileStream = fs.createWriteStream(filePath);

        https
          .get(url, (response) => {
            response.pipe(fileStream);
            fileStream.on("finish", () => {
              fileStream.close();
              resolve(true);
            });
          })
          .on("error", (err) => {
            fs.unlink(filePath, () => {});
            console.log("❌ Download error:", err.message);
            reject(false);
          });
      })
      .catch((err) => {
        console.log("❌ Directory creation error:", err.message);
        reject(false);
      });
  });
}

function capitalizeWords(str) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

if (require.main === module) {
  const args = process.argv.slice(2);
  downloadFont(args[0], args[1] || "*", args[2] || "*");
}
