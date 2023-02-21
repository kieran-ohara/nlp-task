venv: requirements.txt
	python3.9 -m venv $@
	$@/bin/pip install -r $<
