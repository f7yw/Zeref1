# تم التغيير من buster إلى bullseye لأن buster أصبح قديماً وغير مدعوم
FROM node:lts-bullseye

# تحديث المستودعات وتثبيت الأدوات المطلوبة
RUN apt-get update && \
  apt-get install -y \
  ffmpeg \
  imagemagick \
  webp && \
  apt-get upgrade -y && \
  rm -rf /var/lib/apt/lists/*

# نسخ ملف الإعدادات
COPY package.json .

# تثبيت المكتبات البرمجية
RUN npm install && npm install qrcode-terminal

# نسخ باقي ملفات البوت
COPY . .

# فتح المنفذ 5000
EXPOSE 5000

# أمر تشغيل البوت
CMD ["node", "index.js", "--server"]
