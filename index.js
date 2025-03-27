const fs = require("fs");
const https = require("https");
const path = require("path");
const puppeteer = require("puppeteer");
const cliProgress = require("cli-progress"); // Install using: npm install cli-progress

async function downloadFont(name, weight = "*") {
  let weightArray = weight === "*" ? [] : weight;
  const formattedFontWeights = weightArray.map((font) => font.toLowerCase());

  const mainLink = await findFontLink(name);

  if (!mainLink) {
    process.exit();
  }

  const fontWeights = await findFontWeights(mainLink, formattedFontWeights);

  const browser = await puppeteer.launch({ headless: true });
  let completedDownloads = 0;

  const progressBar = new cliProgress.SingleBar(
    {
      format: " {bar} {percentage}% | ETA: {eta}s | {value}/{total}\n\n",
      clearOnComplete: false,
    },
    cliProgress.Presets.shades_classic
  );

  progressBar.start(fontWeights.length, 0);

  for (let k = 0; k < fontWeights.length; k++) {
    const fontWeight = fontWeights[k];

    console.log(
      `\n📥 Starting Font Download: ${capitalizeWords(name)} (${capitalizeWords(
        fontWeight.fontWeight
      )})\n`
    );

    await downloader(
      browser,
      fontWeight.href,
      name,
      capitalizeWords(fontWeight.fontWeight)
    );
    completedDownloads++;
    progressBar.update(completedDownloads);
  }

  progressBar.stop();
  await browser.close();
  console.log("✅ Download Completed");
  process.exit();
}

async function downloader(browser, link, name, weight) {
  const displayName = `${capitalizeWords(name)} ${capitalizeWords(
    weight.replace(/-/g, " ")
  )}`.trim();

  const fileName = `${name.replace(/ /g, "-")}-${weight.replace(
    / /g,
    "-"
  )}.woff2`
    .replace(/--/g, "-")
    .toLowerCase();

  const formattedName = capitalizeWords(name.replace(/-/g, " "));
  const downloadPath = path.resolve("fonts", formattedName, fileName);

  if (fs.existsSync(downloadPath)) {
    console.log(`⏭️  Skipping (Already Exists): ${displayName}`);
    return "skipped";
  }

  const page = await browser.newPage();

  async function requestListener(request) {
    const url = request.url();
    if (targetURL(url)) {
      console.log(`⬇️  Downloading: ${displayName}`);
      await downloadFile(url, downloadPath);
      console.log(`✅ Downloaded: ${displayName}\n`);
      page.off("request", requestListener);
      return true;
    }
  }

  page.on("request", async (request) => await requestListener(request));
  page.on("error", (error) => console.log("❌ Page error:", error));

  await page.goto(link, { timeout: 0, waitUntil: "networkidle2" });
  await page.close();

  return false;
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

async function findFontLink(fontName) {
  try {
    console.log("🔎 Searching for your Font:", fontName);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const formattedFontName = fontName.toLowerCase().replace(/\s+/g, "-");

    const searchUrl = `https://typenetwork.com/search?searchQuery=${encodeURIComponent(
      fontName
    )}`;
    await page.goto(searchUrl, { waitUntil: "networkidle2" });

    // Wait for the search results container to appear
    await page.waitForSelector(".ba.b--light-silver.sans-serif.mv3", {
      timeout: 10000,
    });

    // Extract and filter matching links
    const fontLinks = await page.evaluate((formattedFontName) => {
      return Array.from(document.querySelectorAll("a"))
        .map((a) => ({ href: a.href, text: a.innerText.trim() }))
        .filter((link) =>
          new RegExp(
            `^https://store\\.typenetwork\\.com/foundry/[^/]+/fonts/${formattedFontName}`
          ).test(link.href)
        );
    }, formattedFontName);

    await browser.close();

    if (fontLinks.length === 0) {
      console.log("\n❌ Font not found\n");
      return false;
    } else {
      console.log("\n✅ Font found\n");
      return fontLinks[0].href;
    }
  } catch (error) {
    console.log("\n❌ Font not found\n");
    return false;
  }
}

async function findFontWeights(searchUrl, userWeights = []) {
  try {
    console.log("🔎 Searching for Available Font Weights");

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(searchUrl, { timeout: 0, waitUntil: "networkidle2" });

    // Wait for font listing elements to load
    await page.waitForSelector("a", { timeout: 10000 });

    // Extract the foundry and font name from the search URL
    const urlParts = searchUrl.split("/");
    const foundryType = urlParts[urlParts.indexOf("foundry") + 1];
    const fontName = urlParts[urlParts.indexOf("fonts") + 1];

    // Extract and filter links
    const fontLinks = await page.evaluate(
      (foundryType, fontName) => {
        return Array.from(document.querySelectorAll("a"))
          .map((a) => ({ href: a.href, text: a.innerText.trim() }))
          .filter((link) =>
            new RegExp(
              `^https://store\\.typenetwork\\.com/foundry/${foundryType}/fonts/${fontName}/[^/]+$`
            ).test(link.href)
          )
          .map((link) => {
            const fontWeight = link.href.split("/").pop().replace(/-/g, " "); // Convert to readable format
            return {
              href: link.href,
              fontWeight,
            };
          });
      },
      foundryType,
      fontName
    );

    const availWeights =
      userWeights.length > 0
        ? fontLinks.filter((link) =>
            userWeights.includes(link.fontWeight.toLowerCase())
          )
        : fontLinks;

    await browser.close();

    if (availWeights.length === 0) {
      console.log("\n❌ Font Weights not found\n");
    } else {
      console.log("\n✅ Font Weights found\n");
    }

    return availWeights;
  } catch (error) {
    console.log("\n❌ An Error, Unable to find Font Weights\n");
    process.exit();
  }
}

function capitalizeWords(str) {
  return str
    ?.split(" ")
    ?.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    ?.join(" ");
}

function targetURL(url) {
  if (url.includes("woff2")) {
    const match = url.match(/\/(\d+)\/[^/]+$/);
    return match ? !isNaN(match[1]) : false;
  }
  return false;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const weights = args.slice(1);
  downloadFont(args[0], weights || "*");
}
