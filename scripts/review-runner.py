#!/usr/bin/env python3
"""受控审查运行入口；不改变用户认证或本机设置。"""
import argparse
import json
import subprocess
from pathlib import Path
from lib.review_store import initialize, status
from lib.review_process import MAX_SEGMENT_SECONDS, execute


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('command', choices=['init', 'broker', 'status', 'run'])
    p.add_argument('--run', required=True)
    p.add_argument('--config')
    p.add_argument('--actor')
    p.add_argument('--budget-seconds', type=float, default=MAX_SEGMENT_SECONDS)
    args = p.parse_args()
    try:
        if args.command == 'init':
            result = initialize(Path(args.run), json.loads(Path(args.config).read_text()))
        elif args.command == 'status':
            result = status(Path(args.run))
        elif args.command == 'broker':
            from lib.review_broker import serve
            serve(Path(args.run), args.actor)
            return 0
        else:
            result = execute(Path(args.run), args.budget_seconds)
        print(json.dumps(result, ensure_ascii=False))
        return 0 if result.get('status') not in ['blocked', 'incomplete'] or args.command == 'status' else 1
    except (ValueError, OSError, KeyError, TypeError, subprocess.SubprocessError) as error:
        print(json.dumps({'status': 'blocked', 'gaps': [str(error)]}, ensure_ascii=False))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
