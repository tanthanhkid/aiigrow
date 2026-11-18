import sys,os,numpy as np
from PIL import Image
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from doi_navy import doi
a,b=sys.argv[1],sys.argv[2]
for n in sorted(os.listdir(a)):
    Image.fromarray(doi(np.array(Image.open(os.path.join(a,n)).convert('RGB')))).save(os.path.join(b,n))
