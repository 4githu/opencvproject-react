"use client";
import React, { useRef, useEffect, useState } from 'react';

const AudioVisualizer = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const animationFrameId = useRef<number>();
    const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
    const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState({
        original: false,
        processed: false
    });
    const audioContextRef = useRef<AudioContext | null>(null);
    const allAudioDataRef = useRef<number[]>([]);
    const MAXpoint = 500;

    const drawAudio = () => {
        if (!canvasRef.current || !analyzer) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 오디오 데이터 가져오기
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteTimeDomainData(dataArray);

        for (let i = 0; i < dataArray.length; i++) {
            allAudioDataRef.current.push(dataArray[i]);
        }

        // 캔버스 초기화
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 파형 그리기
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';

        if(MAXpoint < allAudioDataRef.current.length) {
            const sliceWidth = canvas.width / MAXpoint;
            let x = 0;
            for (let i = 0; i < allAudioDataRef.current.length; i += Math.floor(allAudioDataRef.current.length/MAXpoint)+1) {
                const v = (allAudioDataRef.current[i] - 128) / 128;
                const y = (canvas.height / 2) * (1 + v);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }
        }
        ctx.stroke();

        if (isRecording) {
            animationFrameId.current = requestAnimationFrame(drawAudio);
        }
    };

    useEffect(() => {
        if (isRecording) {
            allAudioDataRef.current = [];
            drawAudio();
        } else {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        }
    }, [isRecording]);

    useEffect(() => {
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, []);

    const processAudio = async (audioBlob: Blob) => {
        try {
          // 원본 데이터를 위한 컨텍스트
          const originalContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await originalContext.decodeAudioData(arrayBuffer.slice(0));  // 버퍼 복사
      
          // 처리된 오디오를 위한 별도 컨텍스트
          const processContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // 새로운 버퍼 생성
          const processedBuffer = processContext.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );
      
          // 각 채널의 데이터를 복사하고 위상 반전
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const originalData = audioBuffer.getChannelData(channel);
            const processedData = processedBuffer.getChannelData(channel);
            
            for (let i = 0; i < originalData.length; i++) {
              processedData[i] = -originalData[i];  // 위상 반전
            }
          }
      
          // 처리된 오디오 인코딩
          return new Promise<string>((resolve) => {
            const mediaStreamDest = processContext.createMediaStreamDestination();
            const source = processContext.createBufferSource();
            source.buffer = processedBuffer;
            source.connect(mediaStreamDest);
      
            const mediaRecorder = new MediaRecorder(mediaStreamDest.stream, {
              mimeType: 'audio/webm;codecs=opus'
            });
            
            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
              const blob = new Blob(chunks, { type: 'audio/webm' });
              originalContext.close();  // 원본 컨텍스트 정리
              processContext.close();   // 처리 컨텍스트 정리
              resolve(URL.createObjectURL(blob));
            };
      
            source.start();
            mediaRecorder.start();
            setTimeout(() => mediaRecorder.stop(), processedBuffer.duration * 1000 + 100);
          });
        } catch (error) {
          console.error('Error processing audio:', error);
          return null;
        }
      };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;  // audioContext 저장
            const source = audioContext.createMediaStreamSource(stream);
            const analyzerNode = audioContext.createAnalyser();
            analyzerNode.fftSize = 2048;
            analyzerNode.smoothingTimeConstant = 0.8;
            source.connect(analyzerNode);
            setAnalyzer(analyzerNode);

            setIsRecording(true);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const originalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const originalUrl = URL.createObjectURL(originalBlob);
                setOriginalAudioUrl(originalUrl);

                const processedUrl = await processAudio(originalBlob);
                if (processedUrl) {
                    setProcessedAudioUrl(processedUrl);
                }
            };

            mediaRecorder.start(100);
        } catch (error) {
            console.error("마이크 접근 실패:", error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
        if (analyzer) {
            analyzer.disconnect();
            setAnalyzer(null);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsRecording(false);
    };

    const playAudio = (url: string, type: 'original' | 'processed') => {
        const audio = new Audio(url);
        audio.onended = () => {
            setIsPlaying(prev => ({...prev, [type]: false}));
        };
        audio.play();
        setIsPlaying(prev => ({...prev, [type]: true}));
    };

    const downloadAudio = (url: string, filename: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const playBoth = async () => {
        if (originalAudioUrl && processedAudioUrl) {
            try {
                const audioContext = new AudioContext();
                
                // 두 오디오 파일 로드
                const [originalResponse, processedResponse] = await Promise.all([
                    fetch(originalAudioUrl),
                    fetch(processedAudioUrl)
                ]);
    
                const [originalBuffer, processedBuffer] = await Promise.all([
                    originalResponse.arrayBuffer(),
                    processedResponse.arrayBuffer()
                ]);
    
                const [originalAudioBuffer, processedAudioBuffer] = await Promise.all([
                    audioContext.decodeAudioData(originalBuffer),
                    audioContext.decodeAudioData(processedBuffer)
                ]);
    
                // 소스 및 게인 노드 설정
                const originalSource = audioContext.createBufferSource();
                const processedSource = audioContext.createBufferSource();
                const originalGain = audioContext.createGain();
                const processedGain = audioContext.createGain();
    
                originalSource.buffer = originalAudioBuffer;
                processedSource.buffer = processedAudioBuffer;
    
                // 게인값 설정 (볼륨 조절)
                originalGain.gain.value = 1;
                processedGain.gain.value = 1;
    
                // 연결 설정
                originalSource.connect(originalGain);
                processedSource.connect(processedGain);
                
                // 두 채널 병합
                const merger = audioContext.createChannelMerger(2);
                originalGain.connect(merger);
                processedGain.connect(merger);
                merger.connect(audioContext.destination);
    
                // 동시 재생
                const startTime = audioContext.currentTime + 0.1;
                originalSource.start(startTime+0.04);
                processedSource.start(startTime);
    
                setIsPlaying({original: true, processed: true});
    
                // 재생 종료 처리
                const duration = Math.max(
                    originalAudioBuffer.duration,
                    processedAudioBuffer.duration
                );
    
                setTimeout(() => {
                    setIsPlaying({original: false, processed: false});
                    audioContext.close();
                }, duration * 1000);
    
            } catch (error) {
                console.error('Error playing audio:', error);
                setIsPlaying({original: false, processed: false});
            }
        }
    }

    return (
        <div className = "flex-col justify-center items-center">
            <button 
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                    padding: '10px 20px',
                    backgroundColor: isRecording ? 'red' : 'green',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                {isRecording ? "녹음 중지" : "녹음 시작"}
            </button>
            <div>상태: {isRecording ? "녹음 중" : "대기 중"}</div>
    
            <canvas 
                ref={canvasRef}
                width={500}
                height={200}
                style={{
                    border: '1px solid black',
                    margin: '20px'
                }}
            />
    
            {originalAudioUrl && (
                <>
                    <button 
                        className = "border border-blcak m-10"
                        onClick={() => playAudio(originalAudioUrl, 'original')}
                        disabled={isPlaying.original}
                    >
                        원본 재생
                    </button>
                    <button 
                        onClick={() => downloadAudio(originalAudioUrl, 'original.webm')}
                        style={{marginRight: '10px'}}
                    >
                        원본 다운로드
                    </button>
                </>
            )}
    
            {processedAudioUrl && (
                <>
                    <button 
                        className = "border border-blcak m-10"
                        onClick={() => playAudio(processedAudioUrl, 'processed')}
                        disabled={isPlaying.processed}
                    >
                        처리된 오디오 재생
                    </button>
                    <button 
                        onClick={() => downloadAudio(processedAudioUrl, 'processed.webm')}
                        style={{marginRight: '10px'}}
                    >
                        처리된 오디오 다운로드
                    </button>
                </>
            )}
    
            {originalAudioUrl && processedAudioUrl && (
                <button 
                    onClick={playBoth}
                    disabled={isPlaying.original || isPlaying.processed}
                    style={{marginRight: '10px'}}
                >
                    동시 재생
                </button>
            )}

        </div>
    );
};

export default AudioVisualizer;

/*
"use client";
import React, { useState, useEffect, useRef} from 'react';

const AudioVisualizer = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const animationFrameId = useRef<number>();
    const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
    const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState({
        original: false,
        processed: false
    });

    const downloadAudio = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const drawAudio = () => {
        console.log("일단 여기까진 됨", isRecording);

        if (!canvasRef.current || !analyzer) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 오디오 데이터 가져오기
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteTimeDomainData(dataArray);

        for (let i = 0; i < dataArray.length; i++) {
            allAudioDataRef.current.push(dataArray[i]);
        }


        // 캔버스 초기화
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 파형 그리기
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        
        if(MAXpoint < allAudioDataRef.current.length)
        {
            const sliceWidth = canvas.width / MAXpoint;
            let x = 0;
            console.log(allAudioDataRef.current.length);
            console.log(Math.floor(allAudioDataRef.current.length/MAXpoint)+1);
            for (let i = 0; i < allAudioDataRef.current.length; i += Math.floor(allAudioDataRef.current.length/MAXpoint)+1) {
                const v = (allAudioDataRef.current[i] - 128) / 128;
                const y = (canvas.height / 2) * (1 + v);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }
        }
        

        ctx.stroke();

        // 다음 프레임 요청 (ID 저장)
        if (isRecording) {
            animationFrameId.current = requestAnimationFrame(drawAudio);
        }
    };

    // 녹음 상태가 변경될 때마다 실행
    useEffect(() => {
        if (isRecording) {
            drawAudio();
        } else {
            // 녹음이 중지되면 애니메이션 프레임 취소
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        }
    }, [isRecording]);

    // 컴포넌트가 언마운트될 때 정리
    useEffect(() => {
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, []);

    // 오디오 처리 함수
    const processAudio = async (audioBlob: Blob) => {
        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // 오디오 처리 로직
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            const filter = audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            
            source.connect(filter);
            const mediaStream = audioContext.createMediaStreamDestination();
            filter.connect(mediaStream);
            source.start();
            
            // 처리된 오디오를 Blob으로 변환
            const processedBlob = new Blob([mediaStream.stream], { type: 'audio/webm' });
            return URL.createObjectURL(processedBlob);
        } catch (error) {
            console.error('Error processing audio:', error);
            return null;
        }
    };

    // 녹음 중지 시 처리
    mediaRecorder.onstop = async () => {
        const originalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const originalUrl = URL.createObjectURL(originalBlob);
        setOriginalAudioUrl(originalUrl);

        // 오디오 처리 및 URL 저장
        const processedUrl = await processAudio(originalBlob);
        if (processedUrl) {
            setProcessedAudioUrl(processedUrl);
        }
    };

    // 오디오 재생 함수
    const playAudio = (url: string, type: 'original' | 'processed') => {
        const audio = new Audio(url);
        audio.onended = () => {
            setIsPlaying(prev => ({...prev, [type]: false}));
        };
        audio.play();
        setIsPlaying(prev => ({...prev, [type]: true}));
    };

    // 동시 재생 함수
    const playBoth = () => {
        if (originalAudioUrl && processedAudioUrl) {
            const original = new Audio(originalAudioUrl);
            const processed = new Audio(processedAudioUrl);
            
            original.onended = () => {
                setIsPlaying(prev => ({...prev, original: false}));
            };
            processed.onended = () => {
                setIsPlaying(prev => ({...prev, processed: false}));
            };

            original.play();
            processed.play();
            setIsPlaying({original: true, processed: true});
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyzerNode = audioContext.createAnalyser();
            
            analyzerNode.fftSize = 2048;
            analyzerNode.smoothingTimeConstant = 0.8;
            
            source.connect(analyzerNode);
            setAnalyzer(analyzerNode);
            setIsRecording(true);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            // 여기로 이벤트 핸들러 이동
            mediaRecorder.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const originalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const originalUrl = URL.createObjectURL(originalBlob);
                setOriginalAudioUrl(originalUrl);

                const processedUrl = await processAudio(originalBlob);
                if (processedUrl) {
                    setProcessedAudioUrl(processedUrl);
                }
            };

            mediaRecorder.start(100);
        } catch (error) {
            console.error("마이크 접근 실패:", error);
        }
    };

    const stopRecording = () => {
        // MediaRecorder 중지
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
    
        // 애니메이션 프레임 중지
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
    
        // AudioContext 관련 정리
        if (analyzer) {
            analyzer.disconnect();
            setAnalyzer(null);
        }
    
        setIsRecording(false);
        console.log("녹음 중지!");
    };

    return (
        <div>
            <button 
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                    padding: '10px 20px',
                    backgroundColor: isRecording ? 'red' : 'green',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                {isRecording ? "녹음 중지" : "녹음 시작"}
            </button>
            <div>상태: {isRecording ? "녹음 중" : "대기 중"}</div>
            <canvas 
                ref={canvasRef}
                width={500}
                height={200}
                style={{
                    border: '1px solid black',
                    margin: '20px'
                }}
            />

{originalAudioUrl && (
                <>
                    <button 
                        onClick={() => playAudio(originalAudioUrl, 'original')}
                        disabled={isPlaying.original}
                        style={{marginRight: '10px'}}
                    >
                        원본 재생
                    </button>
                </>
            )}

            {processedAudioUrl && (
                <>
                    <button 
                        onClick={() => playAudio(processedAudioUrl, 'processed')}
                        disabled={isPlaying.processed}
                        style={{marginRight: '10px'}}
                    >
                        처리된 오디오 재생
                    </button>
                </>
            )}

            {originalAudioUrl && processedAudioUrl && (
                <button 
                    onClick={playBoth}
                    disabled={isPlaying.original || isPlaying.processed}
                >
                    동시 재생
                </button>
            )}

        </div>
    );
};

export default AudioVisualizer;
*/