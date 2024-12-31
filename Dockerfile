# Node.js 기본 이미지 설정
FROM node:20

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# 패키지 파일 복사
COPY package.json ./

# 종속성 설치
RUN npm install

# 소스 코드 복사
COPY . .

# 애플리케이션 실행 명령어
CMD ["node", "index.js"]

# 외부에 노출할 포트 설정
EXPOSE 8001
