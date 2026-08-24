// import http from 'k6/http';
// import encoding from 'k6/encoding';

// export default function () {
//     // const credentials = encoding.b64encode('4492:89610390120');
//     const options = {
//         insecureSkipTLSVerify: true,
//     };
//     // const params = {
//     //     headers: {
//     //         Authorization: `Basic ${credentials}`,
//     //     },
//     // };

//     const res = http.get(
//         'https://mens-est.internal/tokyo/a-01718/',
//         // params,
//         options

//     );

//     console.log(res.status);
// }



// import http from 'k6/http';

// export const options = {
//     insecureSkipTLSVerify: true,
// };

// export default function () {
//     const res = http.get(
//         'https://mens-est.internal/tokyo/a-01718/'
//     );

//     console.log(res.status);
// }



// import http from 'k6/http';
// import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
// import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

// export const options = {
//     insecureSkipTLSVerify: true,
// };

// export default function () {
//     const res = http.get(
//         "https://127.0.0.1/tokyo/a-01718/",
//         {
//             headers: {
//                 Host: "mens-est.internal",
//             },
//         }
//     );

//     return {
//         // Hiển thị summary trên terminal
//         stdout: textSummary(data, {
//             indent: ' ',
//             enableColors: true,
//         }),

//         // Report HTML
//         'report.html': htmlReport(data),

//         // Report JSON
//         'report.json': JSON.stringify(data, null, 2),
//     };
// }






import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import encoding from 'k6/encoding';

const isDev = false;

const BASE_URL = isDev ? 'https://dev.mens-est.jp/' : "https://mens-est.internal/tokyo/a-01718/";

const auth = encoding.b64encode('4492:89610390120');

export const options = {
    // Bỏ qua kiểm tra SSL (chỉ nên dùng cho môi trường dev/test)
    insecureSkipTLSVerify: !isDev,

    // Số lượng người dùng ảo chạy đồng thời
    // vus: 20,
vus: 1,
    iterations: 1,
    // Thời gian chạy bài test
    // duration: '30s',

    // Tăng tải dần thay vì tạo toàn bộ user ngay lập tức
    // stages: [
    //     { duration: '1m', target: 500 },   // Tăng từ 0 -> 50 user
    //     { duration: '1m', target: 1000 },  // Tăng từ 50 -> 100 user sau 1m
    //     { duration: '1m', target: 100 },   // Giảm từ 100 -> 30 user sau 1m
    //     { duration: '1m', target: 0 },    // Giảm từ 30 -> 0 user sau 1m
    // ],

    // Không lưu body response để giảm RAM, tăng hiệu năng
    discardResponseBodies: true,

    // User-Agent gửi lên server
    userAgent: 'k6 Performance Test',

    // Các chỉ số hiển thị ở cuối bài test
    summaryTrendStats: [
        'avg',     // Trung bình
        'min',     // Nhanh nhất
        'med',     // Trung vị
        'max',     // Chậm nhất
        'p(90)',   // 90% request dưới giá trị này
        'p(95)',   // 95% request dưới giá trị này
        'p(99)',   // 99% request dưới giá trị này
    ],

    // Điều kiện PASS / FAIL
    thresholds: {
        // 95% request phải nhỏ hơn 500ms
        http_req_duration: ['p(95)<10000'],

        // Tỷ lệ request lỗi phải nhỏ hơn 1%
        http_req_failed: ['rate<0.01'],

        // 99% check() phải thành công
        checks: ['rate>0.99'],
    },
};

function checkPerformance() {
    const url = BASE_URL;

    const params = isDev
    ? {
        headers: {
            Authorization: `Basic ${auth}`,
        },
        tags: {
            vu: `${__VU}`,
            iter: `${__ITER}`,
        },
    }
    : {
        tags: {
            vu: `${__VU}`,
            iter: `${__ITER}`,
        },
    };

const res = http.get(url, params);

    check(res, {
        'Status is 200': (r) => r.status === 200,
    });

    return res;
}


export default function () {
    checkPerformance();

    // Giả lập người dùng ở lại trang 1 giây
    sleep(1);
}

export function handleSummary(data) {
    const now = new Date()
        .toISOString()
        .replace(/[:.]/g, '-');

    return {
        [`report-${now}.html`]: htmlReport(data),
        [`report-${now}.json`]: JSON.stringify(data, null, 2),
    };
}
