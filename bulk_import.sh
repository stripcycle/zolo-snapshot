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
    node ./import.js -f $f && bzip2 $f
  fi
done
