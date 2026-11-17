export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const eiin = url.searchParams.get('eiin');

    // রেসপন্স হেল্পার ফাংশন (ক্রেডিটসহ JSON রিটার্ন করার জন্য)
    const jsonOut = (data, code = 200) => {
      // যদি মূল ডাটা অবজেক্ট বা অ্যারে হয়, তার সাথে মেটাডেটা যুক্ত করা
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

    // EIIN প্যারামিটার চেক করা
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
          const jsonData = JSON.parse(responseText);
          return jsonOut(jsonData, 200);
        } catch (e) {
          // যদি রেসপন্সটি সরাসরি JSON না হয়ে টেক্সট হয়
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
