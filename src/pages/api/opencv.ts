import { NextApiRequest, NextApiResponse } from 'next';
const cv = require('opencv4nodejs');

const 임계값 = 0.4;

// 노드 이름을 인덱스로 매핑
const node_to_index = {};
const MAX_NODES = 10;
const dist = Array.from({ length: MAX_NODES }, () => Array(MAX_NODES).fill(Infinity));
const next_node = Array.from({ length: MAX_NODES }, () => Array(MAX_NODES).fill(-1));
let node_count = 0;

// 노드 목록 (전역 변수로 설정)
const nodes = ["o", "t1", "t2", "t3", "m", "m2", "b1", "b2", "b3"];

// lis 객체 정의
const lis: { [key: string]: Head } = {};

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

// API 핸들러
const handler = (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        const { imagePath } = req.body;

        // OpenCV 작업 수행
        const img = cv.imread(imagePath);
        const checkResult = lis["a605"].check(img);
        const calculResult = lis["a605"].calcul(img);

        res.status(200).json({ checkResult, calculResult });
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default handler;
