# 门诊患者管理

这是一个可部署到云端的门诊患者管理网页。

## 启动

```bash
npm start
```

## 环境变量

```text
APP_USER=admin
APP_PASSWORD=your-password
AUTO_CLEAR_DAILY=true
TZ_OFFSET_MINUTES=480
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_TABLE=clinic_patient_days
```

数据保存到 Supabase，页面只读取当天日期的数据。

## 部署文件

- `clinic-patient-manager.html`
- `server.js`
- `package.json`
- `render.yaml`
- `README-cloud.md`
