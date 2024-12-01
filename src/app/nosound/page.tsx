"use client";

//const fs = require('fs');

export default function Page() {
  const handleClick_example = async () => {
    try {
      const response = await fetch('/nosound/api/findpython_example', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: 'test input' })
      });

      const data = await response.json();
      console.log('Response data:', data); // 응답 데이터 확인

      if (data.result) {
        console.log('Python result:', data.result);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  // 파일을 버퍼로 읽기
  /*
  const fileBuffer = fs.readFileSync('input.mp3');
  const formData = new FormData();
  const blob = new Blob([fileBuffer]);
  formData.append('file', blob, 'input.mp3');
  */
  const formData = new FormData();
  formData.append('fileName', 'input.mp3');


  const handleClick = async () => {
    try {
      const response = await fetch('/nosound/api/findpython_example', {
        method: 'POST',
        body: formData
      });
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      URL.revokeObjectURL(url);
      console.log(url);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  return (
    <div>
        <button id="button1" onClick={handleClick_example}>예제실행</button>
        <br></br>
        <button id="button2" onClick={handleClick}>유제실행</button>
    </div>
  );
}