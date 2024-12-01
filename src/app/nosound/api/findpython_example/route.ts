import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const fs = require('fs');

export async function POST(request: Request) {
  try {
      const buffer = fs.readFileSync('src/app/nosound/api/findpython_example/input.mp3');

      if (!buffer) {
          return NextResponse.json(
              { error: 'No file provided' },
              { status: 400 }
          );
      }

      const scriptPath = path.join(process.cwd(), 'src/app/nosound/script.py');

      return new Promise((resolve, reject) => {
          const pythonProcess = spawn('python', [scriptPath]);
          let outputData = Buffer.alloc(0);
          

          const timeout = setTimeout(() => {
              pythonProcess.kill();
              reject(new Error('Process timeout'));
          }, 30000);

          pythonProcess.stdin.write(buffer);
          pythonProcess.stdin.end();

          pythonProcess.stdout.on('data', (chunk) => {
              outputData = Buffer.concat([outputData, chunk]);
          });

          pythonProcess.stderr.on('data', (data) => {
              console.error('Python error:', data.toString());
          });

          pythonProcess.on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
          });

          pythonProcess.on('close', (code) => {
              clearTimeout(timeout);
              if (code === 0) {
                  resolve(NextResponse.json({
                      success: true,
                      data: outputData.toString('base64')
                  }));
              } else {
                  reject(new Error('Python process failed'));
              }
          });
      });
  } catch (error) {
      return NextResponse.json(
          { error: error.message },
          { status: 500 }
      );
  }
}