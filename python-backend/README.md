# How to activate python scripts

First activate the virtual enviroment and install the requirements with:

```terminal
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

To start fastapi server:
```terminal
fastapi dev
```

To add requiremetns to requirements.txt:
```terminal
pip freeze > requirements.txt
```

Don't forget to add .venv and __pycache__ files to .gitignore if not alreadey there.

You can deactivate the virtual enviroment by using:

```terminal
deactivate
```