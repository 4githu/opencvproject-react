"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Droplets, PackageCheck } from 'lucide-react';

const ImpactCalculator = () => {
  const [vegetarianMeals, setVegetarianMeals] = useState(1);
  const [plasticReduction, setPlasticReduction] = useState(1);

  // 계산식은 예시입니다. 실제 데이터로 대체 가능
  const calculateVegetarianImpact = () => {
    const waterSaved = vegetarianMeals * 2500; // 하루 채식 1회당 2500L 물 절약
    const co2Reduced = vegetarianMeals * 2.5; // 하루 채식 1회당 2.5kg CO2 감소
    const lifespanExtended = (co2Reduced * 365 * 0.0001).toFixed(2); // 연간 효과로 환산
    return { waterSaved, co2Reduced, lifespanExtended };
  };

  const calculatePlasticImpact = () => {
    const plasticSaved = plasticReduction * 0.03; // 하루 1개당 30g 플라스틱 감소
    const oceanImpact = plasticSaved * 100; // 해양 생태계 영향
    const lifespanExtended = (plasticSaved * 365 * 0.0002).toFixed(2); // 연간 효과로 환산
    return { plasticSaved, oceanImpact, lifespanExtended };
  };

  const ImpactSlider = ({ value, onChange, icon, title, description }) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
      />
      <div className="flex justify-between text-sm text-gray-600 mt-2">
        <span>0회</span>
        <span>5회</span>
        <span>10회</span>
      </div>
    </div>
  );

  const ImpactResult = ({ icon, title, value, unit }) => (
    <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg mb-4">
      {icon}
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-xl font-bold text-green-600">
          {value.toLocaleString()} {unit}
        </p>
      </div>
    </div>
  );

  const vegetarianImpact = calculateVegetarianImpact();
  const plasticImpact = calculatePlasticImpact();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">나의 환경 보호 효과 계산하기</CardTitle>
          <CardDescription>
            당신의 작은 실천이 지구에 미치는 긍정적인 영향을 확인해보세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImpactSlider
            value={vegetarianMeals}
            onChange={setVegetarianMeals}
            icon={<Leaf className="w-6 h-6 text-green-500" />}
            title="하루 채식 횟수"
            description="하루에 몇 끼 채식을 하시나요?"
          />
          <ImpactSlider
            value={plasticReduction}
            onChange={setPlasticReduction}
            icon={<PackageCheck className="w-6 h-6 text-blue-500" />}
            title="일회용품 줄이기"
            description="하루에 몇 개의 일회용품 사용을 줄이시나요?"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">당신의 실천이 만드는 변화</CardTitle>
          <CardDescription>연간 환경 보호 효과</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4 text-green-800">
                채식으로 인한 효과
              </h3>
              <ImpactResult
                icon={<Droplets className="w-6 h-6 text-blue-500" />}
                title="절약되는 물의 양"
                value={vegetarianImpact.waterSaved}
                unit="L/일"
              />
              <ImpactResult
                icon={<Leaf className="w-6 h-6 text-green-500" />}
                title="감소되는 이산화탄소"
                value={vegetarianImpact.co2Reduced}
                unit="kg/일"
              />
              <p className="text-sm text-gray-600 mt-4">
                🌍 연간 지구 수명 {vegetarianImpact.lifespanExtended}년 연장 효과
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-blue-800">
                일회용품 줄이기 효과
              </h3>
              <ImpactResult
                icon={<PackageCheck className="w-6 h-6 text-blue-500" />}
                title="감소되는 플라스틱"
                value={plasticImpact.plasticSaved}
                unit="kg/일"
              />
              <p className="text-sm text-gray-600 mt-4">
                🌊 연간 지구 수명 {plasticImpact.lifespanExtended}년 연장 효과
              </p>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800">총 효과</h3>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                연간 지구 수명 {(parseFloat(vegetarianImpact.lifespanExtended) + parseFloat(plasticImpact.lifespanExtended)).toFixed(2)}년 연장
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImpactCalculator;
