# 门诊患者管理

这是一个可部署到云端的临时门诊患者管理网页。

## 启动

```bash
npm start
```

## 环境变量

```text
APP_USER=admin
APP_PASSWORD=your-password
MEMORY_ONLY=true
```

`MEMORY_ONLY=true` 表示数据只保存在服务运行内存里，不持久保存。当天使用结束后可在页面里清空列表；服务重启后数据也会消失。

## 部署文件

- `clinic-patient-manager.html`
- `server.js`
- `package.json`
- `render.yaml`
- `README-cloud.md`
