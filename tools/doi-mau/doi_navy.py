import sys, numpy as np
from PIL import Image
from scipy import ndimage
NAVY=np.array([10,22,41])/255; NAVY2=np.array([0.21,0.31,0.50]); KEM=np.array([0xEC,0xE4,0xD9])/255
def hsv(f):
    mx=f.max(2); mn=f.min(2); d=mx-mn+1e-6; r,g,b=f[...,0],f[...,1],f[...,2]
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    return h,d/(mx+1e-6),mx
def mask_khoi(h,s,v):
    lo=(h>140)&(h<181)&(s>0.30)
    lab,n=ndimage.label(lo)
    if not n: return np.zeros_like(lo,dtype=np.float32)
    sz=ndimage.sum(lo,lab,range(1,n+1)); keep=np.zeros(n+1,bool)
    big=sz.max(); keep[1:]=sz>big*0.02            # khối đất sét + các chữ Grow (thành phần đủ lớn)
    # bỏ thành phần nằm trong vùng Rob nếu nhỏ (ăng-ten, bình tưới, ngón tay)
    m=keep[lab]
    H=lo.shape[0]; chu=np.zeros_like(lo); chu[int(H*0.62):]=True; m|=lo&chu   # mọi nét chữ Grow
    m=ndimage.binary_dilation(m,iterations=6)&(h>120)&(h<186)&(s>0.12)
    w=m*np.clip((s-0.12)/0.2,0,1)
    return ndimage.gaussian_filter(w.astype(np.float32),0.8)*m
def doi(a):
    f=a.astype(np.float32)/255; h,s,v=hsv(f)
    w=mask_khoi(h,s,v)
    k=np.clip((v-0.15)/0.6,0,1)[...,None]
    nav=NAVY*(1-k)+NAVY2*k
    out=f*(1-w[...,None])+nav*w[...,None]
    # quầng xanh nhạt quanh khối + nền trắng → kem
    h2,s2,v2=hsv(out)
    q=((h2>100)&(h2<190)&(s2<0.45)&(v2>0.40)).astype(np.float32)*(1-w)
    out=out*(1-q[...,None]) + (np.repeat(v2[...,None],3,2)*KEM/0.93)*q[...,None]
    h3,s3,v3=hsv(out); nen=np.clip((v3-0.80)/0.12,0,1)*(s3<0.12)
    out=out*(1-nen[...,None])+(out*KEM/0.97)*nen[...,None]
    return (np.clip(out,0,1)*255).astype(np.uint8)
if __name__=="__main__":
    Image.fromarray(doi(np.array(Image.open(sys.argv[1]).convert('RGB')))).save(sys.argv[2])
