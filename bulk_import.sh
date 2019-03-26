#!/usr/bin/env bash

# FILES=`ls ./data | grep \.json$`
#
# echo $FILES
#
# for f in $FILES


for f in ./data/*.json
do
  if [ -f $f ]
  then
    node ./import.js -f $f -m prod && bzip2 $f && sleep 2
  fi
done
