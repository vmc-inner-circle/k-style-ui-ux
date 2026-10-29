# 화면 부품 인벤토리 태깅

목표: 모바일 앱 스크린샷마다 "눈에 보이는 UI 부품 종류"를 아래 분류표 키로 태깅한다. 판단·추천은 하지 말고 관찰만.

## 분류표 (키: 설명)
appbar: 뒤로/제목 상단바 · big-title: 큰 제목으로 시작하는 머리글 · search-bar: 검색창 · top-tabs: 상단 가로 텍스트 탭(스크롤 가능 포함) · segmented: 세그먼트 컨트롤 · chip-row: 칩/필터 칩 줄 · sort-filter-bar: 정렬·필터 버튼 바
banner-carousel: 넘기는 큰 배너(페이지 표시 있음) · strip-banner: 얇은 띠 배너/프로모션 줄 · h-scroller: 가로로 넘기는 카드·상품 줄 · icon-grid: 아이콘+라벨 격자 메뉴(바로가기) · story-circles: 동그란 썸네일 가로 줄
list-row: 아이콘/아바타+글+› 목록 행 · product-grid: 2~3열 상품 카드 격자 · product-list: 왼쪽 썸네일 상품 행 · card: 둥근 카드 블록(흰 블록 포함) · rank-list: 1·2·3 순위 숫자 목록 · section-more: 섹션 제목+"더보기/전체보기"
price: 할인율+가격 표시 · rating: 별점·리뷰 수 · badge: 작은 상태/태그 배지 · avatar: 사람 원형 사진/글자 · heart-like: 찜·좋아요 아이콘 · big-number: 크게 쓴 금액·숫자 · counter-stepper: 수량 −/+ · coupon-ticket: 쿠폰·티켓 모양 카드 · countdown: 남은 시간 타이머
progress: 진행 막대·게이지 · chart: 막대/선/도넛 그래프 · timeline: 세로 단계/이력 · calendar: 달력 · map: 지도 · chat-bubble: 말풍선 대화 · video-live: 영상·라이브 썸네일(재생 표시)
photo-hero: 화면 폭을 채우는 큰 사진 · photo-thumb: 작은 사진 썸네일 · illust-3d: 3D/컬러 일러스트·아이콘 · callout: 색 배경 안내 박스 · tooltip-coach: 말풍선 툴팁·코치마크
bottom-sheet · modal-dialog · toast · fab: 떠 있는 둥근 버튼 · tabbar: 하단 탭바 · sticky-cta: 하단 고정 버튼 · buy-bar: 하단 고정 가격+구매 바 · input-field · checkbox · switch · accordion: 펼침/접힘 · empty-state · keyword-cloud: 최근/인기 검색어 칩 모음 · page-dots: 페이지 점 표시
목록에 없는 부품이 보이면 `other`에 짧은 한국어 이름으로 적는다.

## 출력
각 이미지를 Read로 직접 보고, 결과를 아래 JSON 배열로 지정된 파일에 Write한다(설명 텍스트 없이 JSON만):
[{"file":"파일명","screen_kind":"홈/목록/상세/결제/마이/검색/폼/기타","components":["키",...],"other":["..."],"note":"이 화면에서 가장 눈에 띄는 부품/구성 한 줄"}]
이미지가 실제 앱 화면이 아니면(마케팅 문구 위주 스토어 이미지 등) 그 안에 보이는 앱 화면 부분만 태깅하고 note에 "스토어 이미지"라고 적는다. 여러 화면이 한 이미지에 이어 붙어 있으면 합쳐서 태깅.
마지막 응답은 "완료 N장" 한 줄만.
