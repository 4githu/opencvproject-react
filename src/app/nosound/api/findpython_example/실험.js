import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

async function runPythonScript(inputBuffer) {
    try {
        const scriptPath = path.join(process.cwd(), 'src/app/nosound/script.py');
        
        // Python 프로세스 생성
        const pythonProcess = spawn('python', [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        return new Promise((resolve, reject) => {
            let outputData = Buffer.alloc(0);
            
            // 30초 타임아웃 설정
            const timeout = setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('Python script execution timed out'));
            }, 30000);

            // 데이터 전송
            pythonProcess.stdin.write(inputBuffer);
            pythonProcess.stdin.end();

            // 표준 출력 처리
            pythonProcess.stdout.on('data', (chunk) => {
                outputData = Buffer.concat([outputData, chunk]);
            });

            // 에러 출력 처리
            pythonProcess.stderr.on('data', (data) => {
                console.error('Python error:', data.toString());
            });

            // 프로세스 에러 처리
            pythonProcess.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });

            // 프로세스 종료 처리
            pythonProcess.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    resolve(outputData);
                } else {
                    reject(new Error(`Python process exited with code ${code}`));
                }
            });
        });
    } catch (error) {
        throw new Error(`Failed to execute Python script: ${error.message}`);
    }
}

// 사용 예시
async function processAudio() {
    try {
        const inputBuffer = await fs.readFile('src/app/nosound/api/findpython_example/input.mp3');
        const result = await runPythonScript(inputBuffer);
        return result;
    } catch (error) {
        console.error('Error processing audio:', error);
        throw error;
    }
}

processAudio();