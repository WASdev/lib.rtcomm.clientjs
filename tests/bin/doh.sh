#!/bin/bash

TESTS="/Users/swgraham/Projects/lib.rtcomm.clientjs/tests/"
NODERUNTIME="node"
WD=`pwd`
cd ${TESTS}
if [ "$1" == "" ] 
then
  TEST='test=tests/all'
else
  TEST=$1
fi

echo "Using Tests: ${TEST}"

$NODERUNTIME ${TESTS}/bin/rtcomm_dojo.js load=${TESTS}/bin/rtcomm_config.js load=doh ${TEST}
cd $WD
