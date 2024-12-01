# script.py
import librosa
import soundfile as sf
import io
import sys
import numpy as np

# 표준 입력에서 데이터 읽기


# JSON으로 출력하는 경우
#result = {"status": "success", "data": "processed"}
#print(json.dumps(result))  # 문자열로 변환하여 출력


def load_audio(buffer):
    try:
        with io.BytesIO(buffer) as buf:
            audio, sr = librosa.load(buf, sr=None, mono=True)
        return audio, sr
    except Exception as e:
        #print(f"Error loading audio file: {e}")
        return None, None

def create_inverse_phase(audio, sr, low_freq_strength, high_freq_strength, cutoff_freq):
    print("Creating inverse phase audio")
    
    # 전체 신호를 반전
    inverse_audio = -audio
    
    # 주파수 도메인에서 추가 처리
    freq_domain = np.fft.rfft(inverse_audio)
    freqs = np.fft.rfftfreq(len(audio), 1/sr)
    
    low_mask = freqs < cutoff_freq
    high_mask = freqs >= cutoff_freq
    
    # 저주파와 고주파에 다른 강도 적용
    freq_domain[low_mask] *= low_freq_strength
    freq_domain[high_mask] *= high_freq_strength
    
    inverse_audio = np.fft.irfft(freq_domain)
    
    return inverse_audio

def save_audio(audio):
    try:
        sys.stdout.buffer.write(audio)
    except Exception as e:
        print(f"Error saving audio file: {e}")

def plot_waveforms(original, inverse, sr):
    plt.figure(figsize=(12, 6))
    
    plt.subplot(2, 1, 1)
    librosa.display.waveshow(original, sr=sr)
    plt.title('Original Audio')
    
    plt.subplot(2, 1, 2)
    librosa.display.waveshow(inverse, sr=sr)
    plt.title('Inverse Phase Audio')
    
    plt.tight_layout()
    plt.show()

def process_audio(data, low_freq_strength, high_freq_strength, cutoff_freq):
    audio, sr = load_audio(data)
    if audio is None or sr is None:
        return
    
    inverse_audio = create_inverse_phase(audio, sr, low_freq_strength, high_freq_strength, cutoff_freq)
    
    save_audio(inverse_audio)
    #print(f"\nInverse phase audio created: {output_file}")
    
    # 원본과 반전된 오디오의 파형 비교
    #plot_waveforms(audio, inverse_audio, sr)
    
    # 원본과 반전된 오디오를 더해서 상쇄 확인
    #combined = audio + inverse_audio
    #print(f"Max amplitude of combined audio: {np.max(np.abs(combined))}")

# 사용 예
data = sys.stdin.buffer.read()
low_freq_strength = 1.0
high_freq_strength = 1.0
cutoff_freq = 1000  # Hz

process_audio(data, low_freq_strength, high_freq_strength, cutoff_freq)