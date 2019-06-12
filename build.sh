#!/bin/bash

if [[ $1 == "clean" ]]; then
    rm -r ./resources
fi

if [ -z "$DBVTK_VERSION" ]; then
    DBVTK_VERSION=$(cat package.json \
    | grep version \
    | head -1 \
    | awk -F: '{ print $2 }' \
    | sed 's/[",]//g' \
    | tr -d '[[:space:]]')
fi

DBVTK="dbvtk-${DBVTK_VERSION}.war"

echo $DBVTK

BINTRAY="https://dl.bintray.com/keeps/db-visualization-toolkit/${DBVTK}"
DBVTK_TARGET="./resources/war/dbvtk.war"

#download dbvtk package from bintray
if [ ! -f $DBVTK_TARGET ]; then
    echo "Downloading ${DBVTK} from bintray"
    mkdir -p "./resources/war"
    response=$(curl --write-out %{http_code} -L $BINTRAY -o $DBVTK_TARGET)
    
    if [ "${response}" != "200" ]; then
        echo "Error! version does not exist in Bintray"
        exit 1;
    fi
fi
