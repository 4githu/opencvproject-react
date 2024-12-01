'use client'
import React, { useState } from "react";
import Image from "next/image";

const Frame = (): JSX.Element => {
  const [modalVisible, setModalVisible] = useState(false);
  const [imagePath, setImagePath] = useState("open_yp.bmp");
  const [boxColors, setBoxColors] = useState<{ [key: string]: string }>({
    "a605": "#d9d9d9",
    "a606": "#d9d9d9",
    "a608": "#d9d9d9",
  });
  const [generalBoxColors, setGeneralBoxColors] = useState({"color" : 'bg-green-200', "text" : "시작버튼", "people" : "?"}); 


  const handleClick = async (id: string) => {
    console.log("클릭 이벤트 발생");

    // FastAPI 서버에 POST 요청 보내기
    const response = await fetch('https://opencvproject-python-production.up.railway.app/check_id/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_: id, image_path: imagePath }),
    });

    if (!response.ok) {
      console.error("API 호출 실패:", response.statusText);
      return;
    }

    const data = await response.json();
    console.log("Check Result:", data.check_result);

    // 새로운 색상 객체 생성
    const newBoxColors = {
        ...boxColors,
        [id]: !data.check_result ? "#ff0000" : "#00ff00" // 클릭한 객체의 색상 변경
    };

    setBoxColors(newBoxColors); // 상태 업데이트
  };


  const generalHandleClick = async () => {
    console.log("클릭 이벤트 발생");
    setGeneralBoxColors({
        color: "bg-red-200",
        text: "검사중",
        people: "검사중"
    });

    // FastAPI 서버에 POST 요청 보내기
    const response = await fetch('https://opencvproject-python-production.up.railway.app/check/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({image_path: imagePath }),
    });

    if (!response.ok) {
      console.error("API 호출 실패:", response.statusText);
      return;
    }

    

    const data = await response.json();
    console.log("Check Result:", data.check_result);

    console.log("data:", data);

    const newBoxColors: { [key: string]: string } = { ...boxColors }; // 기존 색상 복사

    for (const id in data.ateendence) {
        newBoxColors[id] = data.ateendence[id] ? "#00ff00" : "#ff0000"; // 색상 업데이트
    }

    // 상태 업데이트
    setBoxColors(newBoxColors); // setBoxColors가 객체를 받도록 설정
    setGeneralBoxColors({"color" : "bg-green-200", "text" : data.howtogo, "people" : String(data.people)});
  };

  return (
    <div className="bg-transparent flex flex-row justify-center w-full">
      <div className="w-[1440px] h-[1024px] relative">
        <div className="absolute w-[1035px] h-40 top-[51px] left-[77px]">
          <div className="relative w-[1033px] h-40 bg-[url(/rectangle-1.svg)] bg-[100%_100%]">
            <div className="top-11 left-[315px] text-6xl text-center absolute [font-family:'Inter-Regular',Helvetica] font-normal text-black tracking-[0] leading-[normal]">
              독서실 자리확인
            </div>
          </div>
        </div>

        <div className="absolute w-44 h-[66px] top-[251px] left-[913px]">
          <div className={`${generalBoxColors.color} flex justify-center items-center`} onClick={() => {generalHandleClick()}}>
            <div className={`${generalBoxColors.color} top-[9px] left-[50px] text-[40px] whitespace-nowrap absolute [font-family:'Inter-Regular',Helvetica] font-normal text-black tracking-[0] leading-[normal]`}>
              {generalBoxColors.text}
            </div>
          </div>
        </div>
        <div className = "text-[20px]">
          <button onClick={() => {setImagePath("/open_yp.bmp"); setModalVisible(true)}}>이미지 1 </button>
          <button onClick={() => {setImagePath("/open_np.bmp"); setModalVisible(true)}}> 이미지 2</button>
        </div>

        <div className="absolute w-[987px] h-[628px] top-[345px] left-[100px] bg-[#fcddbe]">
          <Image
            className="absolute w-[922px] h-[566px] top-[31px] left-[33px] object-cover"
            alt="Image"
            src="/독서실사진.jpg"
            width={500}
            height={300}
          />

          <div className="top-[490px] left-[337px] absolute w-[17px] h-[29px]" style={{ backgroundColor: boxColors["a608"] }} onClick={() => handleClick("a608")} />

          <div className="top-[461px] left-80 absolute w-[17px] h-[29px]" style={{ backgroundColor: boxColors["a605"] }} onClick={() => handleClick("a605")} />

          <div className="top-[490px] left-80 absolute w-[17px] h-[29px]" style={{ backgroundColor: boxColors["a606"] }} onClick={() => handleClick("a606")} />
        </div>

        <div
          className="absolute top-[1767px] left-[217px] w-[17px] h-[29px] bg-[#d9d9d9]"
          aria-label="Rectangle"
        />

        <div className="absolute w-[345px] h-[79px] top-[245px] left-[100px] bg-[#d9d9d9]">
          <div className="top-3.5 left-[66px] text-[40px] whitespace-nowrap absolute [font-family:'Inter-Regular',Helvetica] font-normal text-black tracking-[0] leading-[normal]">
            인원 {generalBoxColors.people} / {Object.keys(boxColors).length}
          </div>
        </div>
      </div>

      {modalVisible && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-5 rounded">
            <h2>선택하신 이미지</h2>
            <Image src={imagePath} alt="Selected" className="h-[50vh] w-auto" width={500} height={300} /> {/* 선택된 이미지 표시 */}
            <button onClick={() => setModalVisible(false)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Frame;