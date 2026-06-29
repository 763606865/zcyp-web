# 蓝湖 MCP 配置说明

当前本机已部署蓝湖 MCP 服务，服务地址为：

```text
http://localhost:8000/mcp?role=Product&name=liujunlin
```

## uni-agent 项目级配置

uni-agent 的项目级 MCP 配置应放在项目根目录下：

```text
.hbuilderx/uni-agent/mcps/lanhu.json
```

配置内容：

```json
{
  "type": "remote",
  "url": "http://localhost:8000/mcp?role=Product&name=liujunlin",
  "enabled": true
}
```

配置保存后，需要重启 HBuilderX，并新开 uni-agent 会话，MCP 工具才会重新加载。

## 注意事项

- 不要把蓝湖 Cookie、Token、`.env` 等敏感信息提交到代码仓库。
- URL 参数建议使用英文或拼音，避免中文参数导致 MCP 客户端解析异常。

## 验证方式

检查服务是否监听：

```shell
lsof -nP -iTCP:8000 -sTCP:LISTEN
```

检查 MCP 初始化是否正常：

```shell
curl -i --max-time 10 \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"uni-agent-check","version":"1.0.0"}}}' \
  "http://localhost:8000/mcp?role=Product&name=liujunlin"
```

如果返回内容中包含类似以下信息，说明蓝湖 MCP 服务本身可用：

```json
{
  "serverInfo": {
    "name": "Lanhu Axure Extractor",
    "version": "3.4.2"
  }
}
```

重启 HBuilderX 后，在 uni-agent 中询问“蓝湖 MCP 可用吗？”。如果会话能识别 `lanhu_get_designs`、`lanhu_get_ai_analyze_design_result`、`lanhu_get_design_slices` 等工具，说明配置已生效。
