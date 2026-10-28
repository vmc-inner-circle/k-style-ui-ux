# 데모: Void Note — main 하네스 + Sonnet

void-app(기기 안에서 녹음·변환하고 회사 Webhook으로만 보내는 iOS 회의 녹음 앱)을 PRD로 옮겨, main의 빈 하네스 템플릿을 Sonnet으로 한 번 돌린 결과입니다.

| 파일 | 내용 |
|---|---|
| `index.html` | 결과물. iPhone 393×852 화면 30개(처음 시작·앱 밖 시작/정지·녹음 중·목록/결과·전송 기록·설정) |
| `brief.md` · `decisions.md` | 하네스 0단계·B단계 산출물(모델이 작성) |
| `prompt-log.md` · `elapsed.txt` | 개입 1회, 5분 33초 |
| `preview/` | `top.png` 첫 화면, `overview.png` 앞쪽 9000px 축소본 |

모델이 스스로 남긴 한계(손대지 않음): A단계 토큰 기준 미충족(토큰 밖 색 약 25종, 선언 밖 글자 크기 9종, 인라인 style 267건), B단계 후보는 글로만 비교, 레퍼런스 앱 조사 안 함.
