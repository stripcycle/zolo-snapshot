#!/usr/bin/env bash

# FILES=`ls ./data | grep \.json$`
#
# echo $FILES
#
# for f in $FILES

FILES=./data/*.json
for f in $FILES
do
  echo "Processing $f file..."
  node ./import.js -f $f && bzip2 $f
done
