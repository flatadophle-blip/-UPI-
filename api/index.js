import axios from "axios";

export default async function handler(req, res) {
  const { key, type, term } = req.query;

  const VALID_KEY = "zxcracks";

  if (!key || key !== VALID_KEY) {
    return res.status(401).json({ error: "Invalid API Key", api_by: "ZX OSINT (SHAURYA & KING)" });
  }

  if (!type || !term) {
    return res.status(400).json({ error: "Missing type or term", api_by: "ZX OSINT (SHAURYA & KING)" });
  }

  try {
    let apiUrl = "";

    // Map type to real API endpoints
    switch(type) {
      case "mailinfo":
        apiUrl = `https://ab-mailinfoapi.vercel.app/info?mail=${encodeURIComponent(term)}`; break;
      case "basicnum":
        apiUrl = `https://ab-calltraceapi.vercel.app/info?number=${encodeURIComponent(term)}`; break;
      case "rc":
        apiUrl = `https://vehicle-eight-vert.vercel.app/api?rc=${encodeURIComponent(term)}`; break;
      case "ifsc":
        apiUrl = `https://ab-ifscinfoapi.vercel.app/info?ifsc=${encodeURIComponent(term)}`; break;
      case "ffbancheck":
        apiUrl = `https://ban-check-api-nwqa.vercel.app/ban-check?uid=${encodeURIComponent(term)}`; break;
      case "pak":
        apiUrl = `https://x.taitaninfo.workers.dev/?paknumber=${encodeURIComponent(term)}`; break;
      case "imei":
        apiUrl = `https://xc.taitaninfo.workers.dev/?imei=${encodeURIComponent(term)}`; break;
      case "imagegenbasic":
        apiUrl = `https://botmaker.serv00.net/pollination.php?prompt=${encodeURIComponent(term)}`; break;
      case "advanceimg":
        apiUrl = `https://splexx-api-img.vercel.app/api/imggen?text=${encodeURIComponent(term)}&key=SPLEXXO`; break;
      default:
        return res.status(400).json({ error: "Invalid type", api_by: "ZX OSINT (SHAURYA & KING)" });
    }

    const response = await axios.get(apiUrl);
    const data = response.data;

    // Remove unwanted fields
    const cleanData = (obj) => {
      if (Array.isArray(obj)) return obj.map(cleanData);
      if (obj && typeof obj === "object") {
        const newObj = {};
        for (const key in obj) {
          if (["owner", "credit", "channel", "developer_credits"].includes(key)) continue;
          newObj[key] = cleanData(obj[key]);
        }
        return newObj;
      }
      return obj;
    };

    return res.status(200).json({ ...cleanData(data), api_by: "ZX OSINT (SHAURYA & KING)" });

  } catch (err) {
    return res.status(500).json({ error: err.message, api_by: "ZX OSINT (SHAURYA & KING)" });
  }
}
