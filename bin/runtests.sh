#!/bin/bash


THISDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="${THISDIR}/.."
INTERN_CLIENT="node_modules/.bin/intern-client"
WD=`pwd`
cd ${PROJECT_ROOT}
if [ "$1" == "" ] 
then
  SUITES=''
else
  SUITES="suites=$1"
fi
echo "Using Suites: ${SUITES}"

echo "Intern Client is: ${INTERN_CLIENT}"

$INTERN_CLIENT config=tests/intern ${SUITES} 

cd $WD
