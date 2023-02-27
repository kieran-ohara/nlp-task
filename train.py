import argparse
import ast
import json
import logging
import os
import sys

from sh import dvc

logging.basicConfig(level=logging.DEBUG)

if __name__ == '__main__':
    for name, value in os.environ.items():
        logging.debug("{0}: {1}".format(name, value))

    parser = argparse.ArgumentParser()
    parser.add_argument('--model_dir', type=str, default=os.environ['SM_MODEL_DIR'])
    parser.add_argument('--channel_names', default=json.loads(os.environ['SM_CHANNELS']))
    args = parser.parse_args()

    logging.debug(args)

    dvc('repro',
        _in=sys.stdin,
        _out=sys.stdout,
        _err=sys.stderr,
        _cwd=args.channel_names['training']
        )
