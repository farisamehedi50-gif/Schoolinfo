export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const eiin = url.searchParams.get('eiin');

    // eiin প্যারামিটার চেক করা
    if (!eiin || eiin.trim() === '') {
      return new Response(
        JSON.stringify({
          status: false,
          message: 'eiin প্যারামিটার প্রয়োজন। উদাহরণ: ?eiin=112234'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    const trimmedEiin = eiin.trim();

    // EIIN ভ্যালিডেশন (শুধু সংখ্যা অনুমোদিত)
    if (!/^\d+$/.test(trimmedEiin)) {
      return new Response(
        JSON.stringify({
          status: false,
          message: 'eiin প্যারামিটার অবশ্যই একটি সংখ্যা হতে হবে।'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    /**
     * ইমেজ URL পূর্ণ করার হেল্পার ফাংশন
     */
    function buildImageUrl(oldPath, empId) {
      if (!oldPath || !empId) {
        return oldPath;
      }
      const parts = oldPath.split('/');
      const fileName = parts[parts.length - 1];
      return `https://apps.emis.gov.bd:9701/api/public/hrm/file/view/${empId}/${fileName}/10`;
    }

    const commonHeaders = {
      'Host': 'apps.emis.gov.bd:9701',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://apps.emis.gov.bd',
      'X-Requested-With': 'com.xbrowser.play',
      'Referer': 'https://apps.emis.gov.bd/',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    try {
      /* ============================================================
         ১) হেড/প্রিন্সিপাল-ভাইস প্রিন্সিপাল লিস্ট (GET)
         ============================================================ */
      const urlHead = `https://apps.emis.gov.bd:9701/api/public/hrm/emp-info/get-head-by-institute-id/0/${trimmedEiin}/0`;
      
      const headResponse = await fetch(urlHead, {
        method: 'GET',
        headers: commonHeaders
      });

      const headText = await headResponse.text();
      let headData;
      try {
        headData = JSON.parse(headText);
      } catch (e) {
        return new Response(
          JSON.stringify({
            status: false,
            message: 'Head API returned invalid JSON. Possibly blocked.',
            raw: headText.substring(0, 200)
          }),
          { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }

      // Head লিস্টের ইমেজ URL পূর্ণ করা
      if (headData && Array.isArray(headData.data)) {
        for (let item of headData.data) {
          if (item.image) {
            const empId = item.id || item.empRefId || null;
            item.image = buildImageUrl(item.image, empId);
          }
        }
      }

      /* ============================================================
         ২) সম্পূর্ণ এমপ্লয়ি লিস্ট (POST / PUT style via fetch)
         ============================================================ */
      const urlList = "https://apps.emis.gov.bd:9701/api/public/hrm/emp-info/get-pageable-emp-list-by-institute";
      
      const listHeaders = {
        ...commonHeaders,
        'Content-Type': 'application/json'
      };

      const listBody = JSON.stringify({
        'listIntParam1': [],
        'page': 0,
        'size': 1000,
        'searchValue': '',
        'intParam1': null,
        'intParam2': 1,
        'stringParam1': trimmedEiin,
      });

      const listResponse = await fetch(urlList, {
        method: 'PUT',
        headers: listHeaders,
        body: listBody
      });

      const listText = await listResponse.text();
      let listData;
      try {
        listData = JSON.parse(listText);
      } catch (e) {
        return new Response(
          JSON.stringify({
            status: false,
            message: 'List API returned invalid JSON. Possibly blocked.',
            raw: listText.substring(0, 200)
          }),
          { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }

      // List এর content-এর ইমেজ URL পূর্ণ করা
      if (listData && listData.data && Array.isArray(listData.data.content)) {
        for (let item of listData.data.content) {
          if (item.image) {
            const empId = item.id || item.empRefId || null;
            item.image = buildImageUrl(item.image, empId);
          }
        }
      }

      /* ============================================================
         ৩) ফাইনাল রেসপন্স রিটার্ন
         ============================================================ */
      const finalResult = {
        status: true,
        eiin: trimmedEiin,
        headInfo: headData,
        employeeList: listData,
        Api_Owner: '@MehediSanix',
        Telegram: '@CobraX_Empire',
        Developer: '@XrootCodeX'
      };

      return new Response(JSON.stringify(finalResult, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });

    } catch (error) {
      return new Response(
        JSON.stringify({
          status: false,
          message: 'Worker fetch error',
          error: error.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }
  }
};
