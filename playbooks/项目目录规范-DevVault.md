# DevVault · 研发全流程资产库

本地目录即数据库。拷走整个目录，换台电脑立刻能查。

## 目录规范（十年不用改）

```
DevVault/
├─ projects/
│  └─ <项目名>/
│     ├─ _project.json
│     ├─ 01-需求/    PRD、需求分析、原型、评审记录
│     ├─ 02-开发/    设计文档、接口文档、SQL、代码包
│     ├─ 03-测试/    用例、自动化脚本、Bug 清单、测试报告
│     ├─ 04-部署/    部署脚本、环境配置、发布记录、回滚方案
│     └─ 05-其他/
├─ _index/           检索索引（可删，重跑 index 即恢复）
├─ _exports/         打包下载产物
└─ tools/devvault.py 全部命令
```

每个资产旁挂一个 `<文件名>.meta.json`，明文可读可改。

## 常用命令

```bash
python tools/devvault.py init
python tools/devvault.py ingest --project 项目名 --src /path/to/资料 --req REQ-001
python tools/devvault.py ingest --project 项目名 --src /path/to/旧资料 --scan   # 原地不动
python tools/devvault.py index
python tools/devvault.py search --q 登录超时 --stage 03-测试
python tools/devvault.py pack --req REQ-001
python tools/devvault.py stats
```

## 三条铁律

1. 索引可删可重建，原始资产永不被索引影响。
2. 同名文件不覆盖，自动落为 `_v1 / _v2`。
3. 敏感文件（.env / 密钥 / 密码类）自动打标，默认不进共享与打包。
