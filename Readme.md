# What is this?

This is some code written to both scrape, and pull data from skillshare. The scraping scripts themselves can be found under `/scraping userscripts`. They are not well documented as they where intended for one-time-use.

Everything under `/api` is the meat of the code that pulls the actual assets from the skillshare site and their providers. It's written.

None of this has been tested in other environments, your mileage may vary.


# How do I use it?

You will need to have some level of proficency with the tools used. This was not designed to be easily distributable. You will also need to install a few things if you do not have an enviornment setup for something like this.

**Note:** The DB dump contains just about every class available, as well as direct download links. I have done some rough curating and preselected the top ~8k classes and put those into the queue tables in the DB, you can start downloading these with no querying required. I selected these based on classes that contained the top 20 tags, had > 1 student, > 1 rating, and a rating > 70%. I have included part of this query at the end of this readme.

### Easy Way (`XAMPP` & `MySQL Workbench`)

1. Download & install [XAMPP](https://www.apachefriends.org/index.html)
2. Download & install [MySQL Workbench](https://dev.mysql.com/downloads/workbench/)
3. Download the DB dump from here, unzip it.
4. Navigate to the XAMPP instlal directory and find the `htdocs` folder.
5. Create a folder named `skillshare`
6. Copy all the contents of this repository into that folder
7. Open MySQL Workbench 
8. Connect to your local database (`localhost:3306` with user of `root` and no password usually). Ignore any incompatability warnings.
9. Go to `Server` -> `Data Import`.
10. Select the `Import From Self-Contained File` option.
11. Browse to your downloaded file and open it.
12. Go to the bottom-right and click `Start Import`. It may prompt you for a password for `root`, just click ok/continue if you don't have one.
13. The import may take several minute to complete, there typically will be no progress bar changes till it completes. Please do not contact me for help if it fails, start googling the error.

Everything is now installed. Please jump do to [Usage and Configuration](#Usage-and-Configuration)

### Other Way

If you're chosing this path, I assume you know what your doing. You just need to do the following:

1. Download the DB dump from here, unzip it.
2. Import this into your MySQL/MariaDB database, the user may need to be changed, it includes the create schema (skillshare)
3. Paste the contents of this repository wherever you need to to get it to run
4. Proceeed to [Usage and Configuration](#Usage-and-Configuration)

## Usage and Configuration

Create a file named `config.php` file and paste the following into it:

```php
<?php

define('DB_HOST', 'localhost');
define('DB_NAME', 'skillshare');

define('DB_USER', 'root');
define('DB_PASS', '');

define('BASE_DOWNLOAD_PATH', "C:\\myfolder\\myotherfolder\\somefolder");
```

Configure the config as necessary for your scenario, setting the hosy, name, username, and password to the appropriate values. Make sure you set a path where you want it to download files to.

One you have done all that, open your webbrowser and go to [http://localhost/skillshare/api/downloader/](http://localhost/skillshare/api/downloader/) or the equivilant for your setup.

You can now download single episodes by their Id, or the entire top ~8k classes that already exist in the database. If you want to downlaod them all, then you will need to insert the appropriate records into the two `queue` tables.


### Misc 

The downloader will automatically retry potentially failed downloads 10 times before moving on.

The `unassign` button in the UI is used to mark a file as not-assigned so it can be retried.

`Parallelism` is the number of simultaneous downloads that you want to run at the same time, adjust this to maximize your bandwidth usage.



### Example Selection Query

```sql
SELECT 
	courses.name as name,
    courses_meta.course_id,
	episodes.videos,
    CONCAT(ROUND(sum(video_size) /1000/1000/1000, 2), ' GB') as 'Videos Size',
    count(distinct attachments.course_id) as attachments,
    CONCAT(ROUND(sum(attachments.size) /1000/1000, 2), ' MB') as 'Attachments Size',
    students,
    reviews_positive / reviews_total as rating
FROM skillshare.courses_meta
INNER JOIN courses ON courses.course_id = courses_meta.course_id
LEFT JOIN (
	SELECT
		course_id,
        SUM(size) as size
	FROM
		attachments
	GROUP BY
		course_id
) attachments ON attachments.course_id = courses_meta.course_id
INNER JOIN (
	SELECT
		course_id,
        SUM(video_size) as video_size,
        COUNT(course_id) as videos
	FROM
		episodes
	WHERE
		has_source = 1
	GROUP BY
		course_id
) episodes ON episodes.course_id = courses_meta.course_id
INNER JOIN (
	SELECT distinct
        course_id
	FROM
		course_tags
	INNER JOIN (
    	SELECT
			id
		FROM
			tags
		ORDER BY followers DESC
		LIMIT 20
    ) topTags ON topTags.id = course_tags.tag_id
) sharedTags ON sharedTags.course_id = courses_meta.course_id
where 
	students > 1
and
	reviews_total > 1
and
	reviews_positive / reviews_total > 0.7
GROUP BY
	courses_meta.course_id, courses.name
```