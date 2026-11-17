export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let eiin = url.searchParams.get('eiin');

    if (!eiin && request.method === 'POST') {
      try {
        const formData = await request.formData();
        eiin = formData.get('eiin');
      } catch (e) {
        try {
          const bodyJson = await request.json();
          eiin = bodyJson.eiin;
        } catch (err) {}
      }
    }

    const jsonOut = (data, code = 200) => {
      let responsePayload = data;
      if (typeof data === 'object' && data !== null) {
        responsePayload = {
          ...data,
          Api_Owner: '@MehediSanix',
          Telegram: '@CobraX_Empire',
          Developer: '@XrootCodeX'
        };
      } else {
        responsePayload = {
          result: data,
          Api_Owner: '@MehediSanix',
          Telegram: '@CobraX_Empire',
          Developer: '@XrootCodeX'
        };
      }

      return new Response(JSON.stringify(responsePayload, null, 2), {
        status: code,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    };

    if (!eiin || eiin.trim() === '') {
      return jsonOut({ error: "EIIN parameter is required" }, 400);
    }

    const targetUrl = "http://emis.gov.bd/emis/Portal/GetTeacherDetails";

    const headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; 220333QAG Build/TKQ1.221114.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.138 Mobile Safari/537.36",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-CSRF-TOKEN": "R2LbLQi4qCGdZlQBpaZX8HKO3TkIrNNiCC8_OsWBTldw4bDiFD8uFLCXXAO4UthhtO4_LPPhjJOv6YhNPrvqFAFIryHqA78XsCsLyAuyp_E1",
      "X-Requested-With": "XMLHttpRequest",
      "Origin": "http://emis.gov.bd",
      "Referer": "http://emis.gov.bd/EMIS/portal",
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "__RequestVerificationToken_L2VtaXM1=t57UIgAYXp8xI0BhiVJpQafm5DB0CP454n0H73wo6P1boE4RkAsF3-IMV5JcaTg2FLlqxqdTPRjaF14N1WqRYzmacZo6gWYX9B8qtgEA3ss1; CSRF-TOKEN=R2LbLQi4qCGdZlQBpaZX8HKO3TkIrNNiCC8_OsWBTldw4bDiFD8uFLCXXAO4UthhtO4_LPPhjJOv6YhNPrvqFAFIryHqA78XsCsLyAuyp_E1"
    };

    const postData = new URLSearchParams({
      'instituteId': '',
      'EIIN': eiin,
      'isTeacher': '1'
    }).toString();

    // HTML ট্যাগ থেকে ছবির আসল লিংক আলাদা করার ফাংশন
    function cleanAndFixData(obj) {
      if (!obj || typeof obj !== 'object') return obj;

      for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          let val = obj[key];

          if (typeof val === 'string') {
            // যদি ফিল্ডটি Image হয় এবং এর মধ্যে HTML ট্যাগ থাকে
            if (key === 'Image' && val.includes('href=')) {
              const match = val.match(/href=['"]([^'"]+)['"]/);
              if (match && match[1]) {
                let imgPath = match[1];
                obj[key] = imgPath.startsWith('http') ? imgPath : "http://emis.gov.bd" + imgPath;
              } else {
                obj[key] = "Not Available";
              }
            } 
            // যদি কোনো মান NULL বা ফাকা থাকে
            else if (val === "NULL" || val === "" || val === "-") {
              obj[key] = "Not Available";
            }
          } else if (typeof val === 'object') {
            cleanAndFixData(val);
          }
        }
      }
      return obj;
    }

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: headers,
        body: postData
      });

      const httpCode = response.status;
      const responseText = await response.text();

      if (httpCode === 200) {
        try {
          let jsonData = JSON.parse(responseText);
          
          // ডেটা ক্লিন এবং ছবির লিংক ঠিক করা
          jsonData = cleanAndFixData(jsonData);

          return jsonOut(jsonData, 200);
        } catch (e) {
          return jsonOut({ raw_data: responseText }, 200);
        }
      } else {
        return jsonOut({ error: "Failed to fetch data", status_code: httpCode }, httpCode);
      }
    } catch (error) {
      return jsonOut({ error: "Network or fetch error", details: error.message }, 500);
    }
  }
};
