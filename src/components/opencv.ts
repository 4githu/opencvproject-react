const cv = require('opencv4nodejs');
// const fs = require('fs');

const 임계값 = 0.4;

// 노드 이름을 인덱스로 매핑
const node_to_index = {};
const MAX_NODES = 10;
const dist = Array.from({ length: MAX_NODES }, () => Array(MAX_NODES).fill(Infinity));
const next_node = Array.from({ length: MAX_NODES }, () => Array(MAX_NODES).fill(-1));
let node_count = 0;

// 노드 목록 (전역 변수로 설정)
const nodes = ["o", "t1", "t2", "t3", "m", "m2", "b1", "b2", "b3"];

class Head {
    constructor(id, x1 = 0, y1 = 0, x2 = 0, y2 = 0) {
        this.id = id;
        this.x1 = x1 * 10;
        this.y1 = y1 * 10;
        this.x2 = x2 * 10;
        this.y2 = y2 * 10;
    }

    calcul(image) {
        if (image.empty) {
            console.error("Image is empty!");
            return -1;
        }

        const img_hsv = image.cvtColor(cv.COLOR_BGR2HSV);
        const meanV = img_hsv.mean().val[2];

        // Validate ROI
        if (this.x1 < 0 || this.y1 < 0 || this.x2 > image.cols || this.y2 > image.rows) {
            console.error("Invalid ROI coordinates!");
            return -1;
        }

        // Define ROI
        const roi = img_hsv.getRegion(new cv.Rect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1));

        // Create binary mask and count black pixels
        const mask1 = roi.inRange(new cv.Vec3(0, 0, 0), new cv.Vec3(255, 40, meanV * 0.7));
        const mask2 = roi.inRange(new cv.Vec3(160, 0, 0), new cv.Vec3(200, 40, meanV * 0.7));
        const 반전 = mask1;
        const blackPixels = 반전.countNonZero();

        // Compute ratio
        const totalPixels = roi.rows * roi.cols;
        const blackRatio = blackPixels / totalPixels;

        return blackRatio;
    }

    check(image) {
        if (image.empty) {
            console.log("이미지를 불러올 수 없습니다!");
            return false;
        }
        return this.calcul(image) > 임계값;
    }
}

const lis = {};

// 플로이드 와샬 알고리즘 함수
function floyd_warshall(edges) {
    for (let i = 0; i < node_count; ++i) {
        for (let j = 0; j < node_count; ++j) {
            if (i === j) {
                dist[i][j] = 0;  // 자기 자신으로 가는 경로는 0
                next_node[i][j] = i;  // 자기 자신으로의 경로는 자기 자신
            }
        }
    }

    // 간선으로 거리 초기화
    edges.forEach(edge => {
        const [src, { first: dst, second: weight }] = edge;
        const u = node_to_index[src];
        const v = node_to_index[dst];

        dist[u][v] = weight;
        dist[v][u] = weight;  // 양방향 간선

        next_node[u][v] = v;  // 경로 추적
        next_node[v][u] = u;  // 경로 추적
    });

    // 플로이드 와샬 알고리즘
    for (let k = 0; k < node_count; ++k) {
        for (let i = 0; i < node_count; ++i) {
            for (let j = 0; j < node_count; ++j) {
                if (dist[i][k] !== Infinity && dist[k][j] !== Infinity) {
                    const new_dist = dist[i][k] + dist[k][j];
                    if (new_dist < dist[i][j]) {
                        dist[i][j] = new_dist;
                        next_node[i][j] = next_node[i][k];  // 경로 갱신
                    }
                }
            }
        }
    }
}

// 두 노드 사이의 경로를 추적하는 함수
function reconstruct_path(start, end) {
    const path = [];
    while (start !== end) {
        path.push(nodes[start]);
        start = next_node[start][end];
    }
    path.push(nodes[end]);
    return path;
}

// 지나쳐야 할 노드를 모두 지나 최단 거리를 계산하는 함수
function find_shortest_path_through_nodes(must_visit) {
    const indices = must_visit.map(node => node_to_index[node]);
    let best_path = [];
    let min_distance = Infinity;

    // 순열 생성
    indices.sort();
    do {
        let current_distance = 0;
        const full_path_segments = []; // 전체 경로 저장

        // o -> 첫 노드
        const current_node = node_to_index["o"];
        const next_node_index = indices[0];
        if (dist[current_node][next_node_index] === Infinity) continue;
        current_distance += dist[current_node][next_node_index];
        full_path_segments.push(reconstruct_path(current_node, next_node_index));

        // 각 노드 간 거리 합산
        let valid_path = true;
        for (let i = 0; i < indices.length - 1; ++i) {
            const u = indices[i], v = indices[i + 1];
            if (dist[u][v] === Infinity) {
                valid_path = false;
                break;
            }
            current_distance += dist[u][v];
            full_path_segments.push(reconstruct_path(u, v));
        }
        if (!valid_path) continue;

        // 마지막 노드 -> o
        const last_node = indices[indices.length - 1];
        if (dist[last_node][node_to_index["o"]] === Infinity) continue;
        current_distance += dist[last_node][node_to_index["o"]];
        full_path_segments.push(reconstruct_path(last_node, node_to_index["o"]));

        // 최단 거리 갱신
        if (current_distance < min_distance) {
            min_distance = current_distance;
            best_path = indices;
        }
    } while (next_permutation(indices));

    // 결과 출력
    if (min_distance === Infinity) {
        console.log("모든 노드를 지나 최단 거리를 찾을 수 없습니다.");
    } else {
        console.log("순찰 경로: ");
        let current_node = node_to_index["o"];
        console.log("o ");
        for (const idx of best_path) {
            const segment = reconstruct_path(current_node, idx);
            for (let i = 1; i < segment.length; ++i) { // 첫 노드는 중복 출력 방지
                console.log(segment[i] + " ");
            }
            current_node = idx;
        }
        const segment = reconstruct_path(current_node, node_to_index["o"]);
        for (let i = 1; i < segment.length; ++i) {
            console.log(segment[i] + " ");
        }
        console.log();
    }
}

function allcheck(img) {
    const must_visit = [];

    for (const [id, h] of Object.entries(lis)) {
        if (!h.check(img)) {
            console.log(`${id} 사람없음`);
            if (!must_visit.includes(h.id)) {
                must_visit.push(h.id);
            }
        }
    }

    // 최단 거리 및 경로 계산
    if (must_visit.length === 0) {
        console.log("전원출석");
    } else {
        find_shortest_path_through_nodes(must_visit);
    }
}

function main() {
    // 노드 이름을 인덱스로 매핑
    nodes.forEach(node => {
        node_to_index[node] = node_count++;
    });

    // 그래프 간선 정의
    const edges = [
        ["o", { first: "t1", second: 13 }],
        ["o", { first: "b1", second: 13 }],
        ["t1", { first: "t2", second: 7 }],
        ["t1", { first: "m", second: 5 }],
        ["t1", { first: "b1", second: 7 }],
        ["t2", { first: "m", second: 3 }],
        ["t2", { first: "t3", second: 12 }],
        ["t3", { first: "m2", second: 7 }],
        ["m", { first: "m2", second: 7 }],
        ["m2", { first: "b3", second: 7 }],
        ["m2", { first: "b2", second: 7 }],
        ["b1", { first: "b2", second: 7 }],
        ["b2", { first: "b3", second: 4 }]
    ];

    // 플로이드 와샬 알고리즘 실행
    floyd_warshall(edges);

    const imgyp = cv.imread("/open_yp.bmp");
    const imgnp = cv.imread("/open_np.bmp");
    const img2 = cv.imread("/머리사진.bmp");

    lis["a605"] = new Head("b2", 25, 40, 53, 63);
    lis["a606"] = new Head("b2", 92, 37, 104, 61);
    lis["a608"] = new Head("b1", 77, 27, 86, 36);

    allcheck(imgyp);
}

if (typeof window === 'undefined') {
    main(); // 서버 측에서만 main 함수를 실행합니다.
}