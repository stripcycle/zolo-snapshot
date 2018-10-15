# TODO

* handle data inconsistencies - some article cards don't have an address because they are too new
* .csv output
* summary stats - some done but needs work...
* use GSheets as data analysis tool
  * create raw csv structure
  * upload into GSheets worksheet
** run analysis scripts using API as datasource
* assessed value / price history from gov't
* MLS # somehow?
* capture lat/long per address
* plan for sharding across sheets? different drive accounts?
  * test: run for a month, calculate data usage

# DONE

* <del>walk listing pages by hood
* <del>parse article elements for as much info as possible
* <del>output file in reasonable format
* <del>handle property _type_

# Report Ideas

* stale property indicator
* list price trends
* assessed / asking price gap

# Architecture

* scrape script -> sheets, runs daily
* generic sheets wrapper lib?
* analysis script - updates report sheet to include latest data by manipulating cell formulas
* utility script
