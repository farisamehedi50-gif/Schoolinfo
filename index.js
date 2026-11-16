export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const eiin = url.searchParams.get('eiin');

    // EIIN চেক করা
    if (!eiin) {
      return new Response(JSON.stringify({
        error: "eiin parameter is required",
        status: 400
      }, null, 2), {
        status: 400,
        headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    try {
      const portalUrl = 'https://emis.gov.bd/EMIS/portalone';
      const cookieJar = `emis_cookie_${eiin}`;

      // ১. পোর্টাল পেজ ফেচ করে কু্যাকি এবং CSRF টোকেন সংগ্রহ
      const portalRes = await fetch(portalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        }
      });

      const portalHtml = await portalRes.text();
      const setCookieHeader = portalRes.headers.get('set-cookie') || '';

      // CSRF টোকেন এক্সট্রাক্ট করা
      let csrfToken = '';
      const match1 = portalHtml.match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/);
      if (match1) csrfToken = match1[1];

      if (!csrfToken) {
        const match2 = portalHtml.match(/<input[^>]+name=["']__RequestVerificationToken["'][^>]+value=["']([^"']+)["']/);
        if (match2) csrfToken = match2[1];
      }

      // ২. মূল API কল (GetTeacherDetails)
      const apiUrl = 'https://emis.gov.bd/emis/Portal/GetTeacherDetails';
      const bodyData = new URLSearchParams({
        instituteId: '',
        EIIN: eiin,
        isTeacher: '',
      });

      const apiRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
          'Origin': 'https://emis.gov.bd',
          'Referer': 'https://emis.gov.bd/EMIS/portalone',
          'X-Requested-With': 'XMLHttpRequest',
          ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
          ...(setCookieHeader ? { 'Cookie': setCookieHeader } : {})
        },
        body: bodyData.toString()
      });

      const responseText = await apiRes.text();
      let teacherData;
      
      try {
        teacherData = JSON.parse(responseText);
      } catch (e) {
        return new Response(JSON.stringify({
          error: "Non-JSON response from EMIS portal",
          rawResponse: responseText.substring(0, 300)
        }, null, 2), {
          status: 502,
          headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
        });
      }

      // ৩. ছবি প্রসেসিং (আপনার পিএইচপি লজিক অনুযায়ী)
      if (Array.isArray(teacherData)) {
        teacherData = teacherData.map(emp => {
          let img = emp['Image'] || '-';
          if (img === '-' || !img) {
            emp['Image'] = null;
          } else {
            const hrefMatch = img.match(/href='([^']+)'/);
            if (hrefMatch) {
              let path = hrefMatch[1];
              emp['Image'] = path.startsWith('http') ? path : 'https://emis.gov.bd' + path;
            } else {
              emp['Image'] = null;
            }
          }
          return emp;
        });
      }

      // ৪. ফাইনাল রেসপন্স উইথ ওনার ও ডেভেলপার ইনফো
      const finalResult = {
        status: "success",
        eiin: eiin,
        total_data: Array.isArray(teacherData) ? teacherData.length : 0,
        data: teacherData,
        "Api Owner": "@MehediSanix",
        "Developer": "@XrootCodeX"
      };

      return new Response(JSON.stringify(finalResult, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        error: "Worker execution failed",
        details: err.message
      }, null, 2), {
        status: 500,
        headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
